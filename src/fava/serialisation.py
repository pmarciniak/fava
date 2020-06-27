"""(De)serialisation of entries.

When adding entries, these are saved via the JSON API - using the functionality
of this module to obtain the appropriate data structures from
`beancount.core.data`. Similarly, for the full entry completion, a JSON
representation of the entry is provided.

This is not intended to work well enough for full roundtrips yet.
"""
import functools
import re

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


def parse_numeric_expression(expression):
    """Parse a numeric expression as entered in an entry form.

    Supports division and addition.
    """
    if not expression:
        return None
    if "/" in expression:
        left, right = expression.split("/")
        return D(left) / D(right)
    if "+" in expression:
        accumulated_sum = D("0")
        for num in expression.split("+"):
            accumulated_sum += D(num)
        return accumulated_sum
    return D(expression)


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
    if amount:
        if "@" in amount:
            amount, raw_price = amount.split("@")
            price = A(raw_price)
        remainder = ""
        match = re.match(r"([0-9.\-\+\/ ]*[0-9])(.*)", amount)
        if match:
            amount = match.group(1)
            remainder = match.group(2)
        pos = position.from_string(
            str(parse_numeric_expression(amount)) + remainder
        )
        units = pos.units
        if re.search(r"{\s*}", remainder):
            cost = data.CostSpec(MISSING, None, MISSING, None, None, False)
        else:
            cost = pos.cost
    else:
        units, cost = None, None
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
