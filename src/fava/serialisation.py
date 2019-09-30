"""(De)serialisation of entries.

When adding entries, these are saved via the JSON API - using the functionality
of this module to obtain the appropriate data structures from
`beancount.core.data`. Similarly, for the full entry completion, a JSON
representation of the entry is provided.

This is not intended to work well enough for full roundtrips yet.
"""
<<<<<<< HEAD:src/fava/serialisation.py
=======

import ast
>>>>>>> Non hacky support for arithmetic expressions.:fava/serialisation.py
import functools
import operator
import re
from io import StringIO
from tokenize import generate_tokens, untokenize, NAME, NUMBER, OP, STRING

from beancount.core.amount import Amount
from beancount.core.data import Balance
from beancount.core.data import EMPTY_SET
from beancount.core.data import Note
from beancount.core.data import Posting
from beancount.core.data import Transaction
from beancount.core.number import D
from beancount.core.position import to_string as position_to_string
from beancount.parser.parser import parse_string

from fava import util
from fava.helpers import FavaAPIException


def extract_tags_links(string):
    """Extract tags and links from a narration string.

    Args:
        string: A string, possibly containing tags (`#tag`) and links
        (`^link`).

    Returns:
        A triple (new_string, tags, links) where `new_string` is `string`
        stripped of tags and links.
    """

    if string is None:
        return None, EMPTY_SET, EMPTY_SET

    tags = re.findall(r"(?:^|\s)#([A-Za-z0-9\-_/.]+)", string)
    links = re.findall(r"(?:^|\s)\^([A-Za-z0-9\-_/.]+)", string)
    new_string = re.sub(r"(?:^|\s)[#^]([A-Za-z0-9\-_/.]+)", "", string).strip()

    return new_string, frozenset(tags), frozenset(links)


def is_float_literal_(literal):
    return re.search(r"^[0-9.][0-9.]*$", literal)


def decimalize_statement_(statement):
    """Wraps every float number in the statement string with a call to D().

    Example: "3.14" -> "D(3.14)"
    """
    result = []
    g = generate_tokens(StringIO(statement).readline)  # tokenize the string
    for toknum, tokval, _, _, _ in g:
        if toknum == NUMBER and is_float_literal_(tokval):
            result.extend(
                [(NAME, "D"), (OP, "("), (STRING, repr(tokval)), (OP, ")")]
            )
        else:
            result.append((toknum, tokval))
    return untokenize(result)


def eval_(node):
    supported_operators = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.USub: operator.neg,
    }
    if isinstance(node, ast.Call) and node.func.id == "D":  # D(<number>)
        return D(node.args[0].s)
    elif isinstance(node, ast.BinOp):  # <left> <operator> <right>
        return supported_operators[type(node.op)](
            eval_(node.left), eval_(node.right)
        )
    elif isinstance(node, ast.UnaryOp):  # <operator> <operand> e.g., -1
        return supported_operators[type(node.op)](eval_(node.operand))
    else:
        raise TypeError(node)


def parse_numerical_expression(expression):
    """Parse a numeric expression as entered in an entry form.

    Supports addition, subtraction, multiplication and division.

    Raises:
        FavaAPIException: if the given expression cannot be parsed.
    """
    if not expression:
        return None
    try:
        return eval_(
            ast.parse(decimalize_statement_(expression), mode="eval").body
        )
    except (TypeError, KeyError):
        raise FavaAPIException(
            "Invalid arithmetic expression: {}".format(expression)
        )


@functools.singledispatch
def serialise(entry):
    """Serialise an entry."""
    if not entry:
        return None
    ret = entry._asdict()
    ret["type"] = entry.__class__.__name__
    if ret["type"] == "Transaction":
        ret["payee"] = entry.payee or ""
        if entry.tags:
            ret["narration"] += " " + " ".join(["#" + t for t in entry.tags])
        if entry.links:
            ret["narration"] += " " + " ".join(
                ["^" + link for link in entry.links]
            )
        del ret["links"]
        del ret["tags"]
        ret["postings"] = [serialise(pos) for pos in entry.postings]
    elif ret["type"] == "Balance":
        amt = ret["amount"]
        ret["amount"] = {"number": str(amt.number), "currency": amt.currency}
    return ret


@serialise.register(Posting)
def _serialise_posting(posting):
    """Serialise a posting."""
    if isinstance(posting.units, Amount):
        position_str = position_to_string(posting)
    else:
        position_str = ""

    if posting.price is not None:
        position_str += f" @ {posting.price.to_string()}"
    return {"account": posting.account, "amount": position_str}


def deserialise_posting(posting):
    """Parse JSON to a Beancount Posting."""
    amount = posting.get("amount")
    price = None
    total_price = None
    if amount:
        if "@@" in amount:
            amount, raw_total_price = amount.split("@@")
            total_price = A(raw_total_price)
        elif "@" in amount:
            amount, raw_price = amount.split("@")
            price = A(raw_price)
        remainder = ""
        match = re.match(r"([0-9.\-\+\/\* ]*[0-9])(.*)", amount)
        if match:
            amount = match.group(1)
            remainder = match.group(2)
        pos = position.from_string(
            str(parse_numerical_expression(amount)) + remainder
        )
        units = pos.units
        if re.search(r"{\s*}", remainder):
            cost = data.CostSpec(MISSING, None, MISSING, None, None, False)
        else:
            cost = pos.cost
    else:
        units, cost = None, None
    if total_price is not None:
        return data.Posting(
            posting["account"],
            units,
            cost,
            Amount(
                total_price.number / units.number.copy_abs(),
                total_price.currency,
            ),
            None,
            None,
        )
    return data.Posting(posting["account"], units, cost, price, None, None)


def deserialise(json_entry):
    """Parse JSON to a Beancount entry.

    Args:
        json_entry: The entry.

    Raises:
        KeyError: if one of the required entry fields is missing.
        FavaAPIException: if the type of the given entry is not supported.
    """
    if json_entry["type"] == "Transaction":
        date = util.date.parse_date(json_entry["date"])[0]
        narration, tags, links = extract_tags_links(json_entry["narration"])
        postings = [deserialise_posting(pos) for pos in json_entry["postings"]]
        return Transaction(
            json_entry["meta"],
            date,
            json_entry.get("flag", ""),
            json_entry.get("payee", ""),
            narration,
            tags,
            links,
            postings,
        )
    if json_entry["type"] == "Balance":
        date = util.date.parse_date(json_entry["date"])[0]
        raw_amount = json_entry["amount"]
        number = parse_numeric_expression(raw_amount["number"])
        amount = Amount(number, raw_amount["currency"])

        return Balance(
            json_entry["meta"], date, json_entry["account"], amount, None, None
        )
    if json_entry["type"] == "Note":
        date = util.date.parse_date(json_entry["date"])[0]
        comment = json_entry["comment"].replace('"', "")
        return Note(json_entry["meta"], date, json_entry["account"], comment)
    raise FavaAPIException("Unsupported entry type.")
