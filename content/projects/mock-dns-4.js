/* mock-dns-4 — DNS Resolver (Black Box), 4-level assessment variant.
 *
 * Source archetype: the "hand-write a DNS resolver" online
 * assessment taught step-by-step in curriculum module m47
 * ("DNS Resolver — The Online Assessment, Step by Step") and module m46
 * ("Resolver & Black-Box Mastery"). This compresses that 7-step arc into the
 * canonical 4-level assessment shape so it can be rehearsed under one 90-minute clock.
 *
 * THE BLACK-BOX RULE (the whole point of this archetype):
 *   The network is INJECTED as `send_query(name, server_ip)`. You may ONLY
 *   call it and parse the response dict it returns. You never reach into the
 *   network's storage. Every name you get back (in answers/authority/additional)
 *   is untrusted input and must be re-normalized before you compare or reuse it.
 *
 * Response shape (the same dict at every level):
 *   {"status": "NOERROR" | "NXDOMAIN" | "REFUSED",
 *    "answers":    [(name, "A"|"AAAA"|"CNAME", value), ...],
 *    "authority":  [(zone, "NS", ns_name), ...],
 *    "additional": [(ns_name, "A", ip), ...]}   # "glue": IPs for the nameservers
 *
 * The 4-level arc:
 *   L1 — iterative resolution: start at the root IP, follow NS delegations
 *        using the glue IP in `additional`, until a server answers with an A
 *        record for your name. (Glue always present; NOERROR only.)
 *   L2 — CNAME aliases: a CNAME answer means "this name is an alias"; take the
 *        canonical target, re-normalize it, and RESTART from the root. Chains
 *        may restart several times before landing on an A record.
 *   L3 — robustness: missing glue (resolve the nameserver's own name from the
 *        root first, then continue), NXDOMAIN as a DEFINITIVE failure (no
 *        fallback), and REFUSED/SERVFAIL as a per-server failure that falls
 *        back to the NEXT nameserver in the authority list.
 *   L4 — capstone: a loop guard (never re-query the same (server, name) on one
 *        path; cap total queries) so cycles return None instead of hanging,
 *        plus `resolve_all(names, send_query)` that resolves a batch behind a
 *        SHARED response cache so a repeated query is only sent once.
 *
 * Functions (not a class): the candidate grows a single `resolve` function
 * across L1-L3, then adds `resolve_all` at L4. Tests do `from solution import
 * resolve` (and `resolve_all` at L4). Every level builds on the last; a correct
 * L4 solution passes all four levels' tests.
 */

const STARTER = `ROOT_IP = "198.41.0.4"


def resolve(name, send_query, root_ip=ROOT_IP):
    """Iteratively resolve a domain name to an IP using the injected network.

    THE BLACK-BOX RULE: send_query(name, server_ip) is the ONLY way to touch
    the network. It returns a response dict shaped like:

        {"status": "NOERROR" | "NXDOMAIN" | "REFUSED",
         "answers":    [(name, "A" | "AAAA" | "CNAME", value), ...],
         "authority":  [(zone, "NS", ns_name), ...],
         "additional": [(ns_name, "A", ip), ...]}   # glue: IPs for nameservers

    You may only CALL send_query and parse the dict it returns. Never reach
    past it into the network's storage. Re-normalize every name the response
    hands back before comparing or reusing it.

    Return the resolved IP string, or None if the name cannot be resolved.
    """
    pass
`;

/* ---------------------------------------------------------------- L1 ---- */

const SOL_1 = `ROOT_IP = "198.41.0.4"


def normalize(name):
    # Canonical form: lowercase, exactly one trailing dot. Root collapses to ".".
    stripped = name.strip().lower().rstrip('.')
    return stripped + '.' if stripped else '.'


def _find_a(response, name):
    # First A record in answers whose owner (re-normalized) matches name.
    for owner, rtype, value in response["answers"]:
        if rtype == "A" and normalize(owner) == name:
            return value
    return None


def _glue_ip(response, ns_name):
    # The nameserver's IP from the additional/glue section.
    ns_name = normalize(ns_name)
    for owner, rtype, value in response["additional"]:
        if rtype == "A" and normalize(owner) == ns_name:
            return value
    return None


def resolve(name, send_query, root_ip=ROOT_IP):
    # Iterative walk: the query NAME never changes, only the server IP does.
    name = normalize(name)
    server_ip = root_ip
    while True:
        response = send_query(name, server_ip)
        if response["status"] != "NOERROR":
            return None
        ip = _find_a(response, name)
        if ip is not None:
            return ip
        # No answer -> follow the first NS delegation we have glue for.
        next_ip = None
        for owner, rtype, ns_name in response["authority"]:
            if rtype == "NS":
                glue = _glue_ip(response, ns_name)
                if glue is not None:
                    next_ip = glue
                    break
        if next_ip is None:
            return None  # no answer and nowhere to delegate
        server_ip = next_ip
`;

const TESTS_1 = `import unittest
from solution import resolve

ROOT = "198.41.0.4"
TLD = "192.5.6.30"
AUTH = "10.0.0.53"


def make_network(table):
    calls = []

    def send_query(name, server_ip):
        calls.append((server_ip, name))
        return table[(server_ip, name)]

    return send_query, calls


class Level1Tests(unittest.TestCase):
    def _three_hop_table(self):
        return {
            (ROOT, "www.example.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("com.", "NS", "a.gtld.net.")],
                "additional": [("a.gtld.net.", "A", TLD)],
            },
            (TLD, "www.example.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("example.com.", "NS", "ns1.example.com.")],
                "additional": [("ns1.example.com.", "A", AUTH)],
            },
            (AUTH, "www.example.com."): {
                "status": "NOERROR",
                "answers": [("www.example.com.", "A", "93.184.216.34")],
                "authority": [], "additional": [],
            },
        }

    def testLevel1_three_hop_resolution(self):
        send_query, calls = make_network(self._three_hop_table())
        self.assertEqual(resolve("WWW.Example.com", send_query), "93.184.216.34")
        # exactly root -> tld -> auth, in order, all normalized
        self.assertEqual(calls, [
            (ROOT, "www.example.com."),
            (TLD, "www.example.com."),
            (AUTH, "www.example.com."),
        ])

    def testLevel1_starts_at_root(self):
        send_query, calls = make_network(self._three_hop_table())
        resolve("www.example.com", send_query)
        self.assertEqual(calls[0][0], ROOT)

    def testLevel1_single_hop_direct_answer(self):
        send_query, calls = make_network({
            (ROOT, "a.com."): {
                "status": "NOERROR",
                "answers": [("a.com.", "A", "1.1.1.1")],
                "authority": [], "additional": [],
            },
        })
        self.assertEqual(resolve("a.com", send_query), "1.1.1.1")
        self.assertEqual(len(calls), 1)

    def testLevel1_dead_end_returns_none(self):
        # NOERROR but no answer and no delegation -> nothing to chase.
        send_query, _ = make_network({
            (ROOT, "void.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [], "additional": [],
            },
        })
        self.assertIsNone(resolve("void.com", send_query))

    def testLevel1_nxdomain_returns_none(self):
        send_query, _ = make_network({
            (ROOT, "nope.com."): {
                "status": "NXDOMAIN", "answers": [],
                "authority": [], "additional": [],
            },
        })
        self.assertIsNone(resolve("nope.com", send_query))


if __name__ == '__main__':
    unittest.main()
`;

/* ---------------------------------------------------------------- L2 ---- */

const SOL_2 = `ROOT_IP = "198.41.0.4"


def normalize(name):
    stripped = name.strip().lower().rstrip('.')
    return stripped + '.' if stripped else '.'


def _find_a(response, name):
    for owner, rtype, value in response["answers"]:
        if rtype == "A" and normalize(owner) == name:
            return value
    return None


def _find_cname(response, name):
    # A CNAME for our name -> its canonical target (re-normalized).
    for owner, rtype, value in response["answers"]:
        if rtype == "CNAME" and normalize(owner) == name:
            return normalize(value)
    return None


def _glue_ip(response, ns_name):
    ns_name = normalize(ns_name)
    for owner, rtype, value in response["additional"]:
        if rtype == "A" and normalize(owner) == ns_name:
            return value
    return None


def resolve(name, send_query, root_ip=ROOT_IP):
    name = normalize(name)
    server_ip = root_ip
    while True:
        response = send_query(name, server_ip)
        if response["status"] != "NOERROR":
            return None
        ip = _find_a(response, name)
        if ip is not None:
            return ip
        # A CNAME means: this name is an alias. Adopt the target and RESTART
        # from the root. Chains restart as many times as needed.
        cname = _find_cname(response, name)
        if cname is not None:
            name = cname
            server_ip = root_ip
            continue
        next_ip = None
        for owner, rtype, ns_name in response["authority"]:
            if rtype == "NS":
                glue = _glue_ip(response, ns_name)
                if glue is not None:
                    next_ip = glue
                    break
        if next_ip is None:
            return None
        server_ip = next_ip
`;

const TESTS_2 = `import unittest
from solution import resolve

ROOT = "198.41.0.4"
AUTH = "10.0.0.53"


def make_network(table):
    calls = []

    def send_query(name, server_ip):
        calls.append((server_ip, name))
        return table[(server_ip, name)]

    return send_query, calls


def _ans(records):
    return {"status": "NOERROR", "answers": records, "authority": [], "additional": []}


class Level2Tests(unittest.TestCase):
    def testLevel2_single_cname_restart(self):
        send_query, _ = make_network({
            (ROOT, "www.a.com."): _ans([("www.a.com.", "CNAME", "a.com.")]),
            (ROOT, "a.com."): _ans([("a.com.", "A", "1.1.1.1")]),
        })
        self.assertEqual(resolve("www.a.com", send_query), "1.1.1.1")

    def testLevel2_cname_chain(self):
        send_query, _ = make_network({
            (ROOT, "www.x.com."): _ans([("www.x.com.", "CNAME", "web.x.com.")]),
            (ROOT, "web.x.com."): _ans([("web.x.com.", "CNAME", "host.x.com.")]),
            (ROOT, "host.x.com."): _ans([("host.x.com.", "A", "5.5.5.5")]),
        })
        self.assertEqual(resolve("www.x.com", send_query), "5.5.5.5")

    def testLevel2_cname_target_is_renormalized(self):
        # The CNAME value comes back messy; it must be normalized before reuse.
        send_query, calls = make_network({
            (ROOT, "www.a.com."): _ans([("www.a.com.", "CNAME", "A.COM")]),
            (ROOT, "a.com."): _ans([("a.com.", "A", "9.9.9.9")]),
        })
        self.assertEqual(resolve("WWW.A.com", send_query), "9.9.9.9")
        # the restart query used the normalized target, not "A.COM"
        self.assertIn((ROOT, "a.com."), calls)

    def testLevel2_cname_then_delegation(self):
        # Alias target still has to be walked down a normal delegation.
        send_query, _ = make_network({
            (ROOT, "www.a.com."): _ans([("www.a.com.", "CNAME", "b.com.")]),
            (ROOT, "b.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("com.", "NS", "ns.b.com.")],
                "additional": [("ns.b.com.", "A", AUTH)],
            },
            (AUTH, "b.com."): _ans([("b.com.", "A", "3.3.3.3")]),
        })
        self.assertEqual(resolve("www.a.com", send_query), "3.3.3.3")

    def testLevel2_plain_resolution_still_works(self):
        # L1 behavior must not regress: a direct A answer with no CNAME.
        send_query, _ = make_network({
            (ROOT, "a.com."): _ans([("a.com.", "A", "1.2.3.4")]),
        })
        self.assertEqual(resolve("a.com", send_query), "1.2.3.4")


if __name__ == '__main__':
    unittest.main()
`;

/* ---------------------------------------------------------------- L3 ---- */

const SOL_3 = `ROOT_IP = "198.41.0.4"


class _NXDomain(Exception):
    """Raised on a definitive NXDOMAIN so it aborts sibling NS attempts."""


def normalize(name):
    stripped = name.strip().lower().rstrip('.')
    return stripped + '.' if stripped else '.'


def _find_a(response, name):
    for owner, rtype, value in response["answers"]:
        if rtype == "A" and normalize(owner) == name:
            return value
    return None


def _find_cname(response, name):
    for owner, rtype, value in response["answers"]:
        if rtype == "CNAME" and normalize(owner) == name:
            return normalize(value)
    return None


def _glue_ip(response, ns_name):
    ns_name = normalize(ns_name)
    for owner, rtype, value in response["additional"]:
        if rtype == "A" and normalize(owner) == ns_name:
            return value
    return None


def _resolve(name, server_ip, send_query, root_ip, seen):
    # Recursive so we can BACKTRACK across nameservers and resolve missing glue.
    if (server_ip, name) in seen:
        return None  # already on this path -> loop guard
    seen = seen | {(server_ip, name)}

    response = send_query(name, server_ip)
    status = response["status"]
    if status == "NXDOMAIN":
        raise _NXDomain()        # definitive: the name does not exist
    if status != "NOERROR":
        return None              # REFUSED/SERVFAIL: this server failed -> caller falls back

    ip = _find_a(response, name)
    if ip is not None:
        return ip

    cname = _find_cname(response, name)
    if cname is not None:
        return _resolve(cname, root_ip, send_query, root_ip, seen)

    # Delegation with NS fallback: try each NS in turn.
    for owner, rtype, ns_name in response["authority"]:
        if rtype != "NS":
            continue
        ns_name = normalize(ns_name)
        glue = _glue_ip(response, ns_name)
        if glue is None:
            # MISSING GLUE: resolve the nameserver's own name from the root first.
            glue = _resolve(ns_name, root_ip, send_query, root_ip, seen)
            if glue is None:
                continue
        result = _resolve(name, glue, send_query, root_ip, seen)
        if result is not None:
            return result
    return None


def resolve(name, send_query, root_ip=ROOT_IP):
    try:
        return _resolve(normalize(name), root_ip, send_query, root_ip, frozenset())
    except _NXDomain:
        return None
`;

const TESTS_3 = `import unittest
from solution import resolve

ROOT = "198.41.0.4"


def make_network(table):
    calls = []

    def send_query(name, server_ip):
        calls.append((server_ip, name))
        return table[(server_ip, name)]

    return send_query, calls


def _ans(records):
    return {"status": "NOERROR", "answers": records, "authority": [], "additional": []}


class Level3Tests(unittest.TestCase):
    def testLevel3_missing_glue_resolves_nameserver_first(self):
        NS_IP = "10.0.0.53"
        AUTH = "10.0.0.99"
        send_query, calls = make_network({
            # root delegates to ns1.example.com but provides NO glue
            (ROOT, "www.example.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("example.com.", "NS", "ns1.example.com.")],
                "additional": [],
            },
            # so we must resolve ns1.example.com from the root to get its IP
            (ROOT, "ns1.example.com."): _ans([("ns1.example.com.", "A", NS_IP)]),
            # then re-ask the original name at that nameserver
            (NS_IP, "www.example.com."): _ans([("www.example.com.", "A", "8.8.8.8")]),
        })
        self.assertEqual(resolve("www.example.com", send_query), "8.8.8.8")
        self.assertIn((ROOT, "ns1.example.com."), calls)
        self.assertIn((NS_IP, "www.example.com."), calls)

    def testLevel3_nxdomain_is_definitive_no_fallback(self):
        AUTH1 = "10.0.0.1"
        AUTH2 = "10.0.0.2"
        send_query, calls = make_network({
            (ROOT, "ghost.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("com.", "NS", "ns1.com."), ("com.", "NS", "ns2.com.")],
                "additional": [("ns1.com.", "A", AUTH1), ("ns2.com.", "A", AUTH2)],
            },
            (AUTH1, "ghost.com."): {
                "status": "NXDOMAIN", "answers": [], "authority": [], "additional": [],
            },
            # ns2 WOULD answer -- but a definitive NXDOMAIN must stop us first
            (AUTH2, "ghost.com."): _ans([("ghost.com.", "A", "6.6.6.6")]),
        })
        self.assertIsNone(resolve("ghost.com", send_query))
        self.assertNotIn((AUTH2, "ghost.com."), calls)  # never fell back

    def testLevel3_refused_falls_back_to_next_ns(self):
        B1 = "10.0.0.11"
        B2 = "10.0.0.22"
        send_query, calls = make_network({
            (ROOT, "shop.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("com.", "NS", "ns1.com."), ("com.", "NS", "ns2.com.")],
                "additional": [("ns1.com.", "A", B1), ("ns2.com.", "A", B2)],
            },
            (B1, "shop.com."): {
                "status": "REFUSED", "answers": [], "authority": [], "additional": [],
            },
            (B2, "shop.com."): _ans([("shop.com.", "A", "7.7.7.7")]),
        })
        self.assertEqual(resolve("shop.com", send_query), "7.7.7.7")
        self.assertIn((B2, "shop.com."), calls)  # did fall back

    def testLevel3_all_nameservers_fail_returns_none(self):
        B1 = "10.0.0.11"
        send_query, _ = make_network({
            (ROOT, "down.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("com.", "NS", "ns1.com.")],
                "additional": [("ns1.com.", "A", B1)],
            },
            (B1, "down.com."): {
                "status": "REFUSED", "answers": [], "authority": [], "additional": [],
            },
        })
        self.assertIsNone(resolve("down.com", send_query))

    def testLevel3_plain_chain_still_resolves(self):
        TLD = "192.5.6.30"
        AUTH = "10.0.0.53"
        send_query, _ = make_network({
            (ROOT, "a.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("com.", "NS", "ns.gtld.net.")],
                "additional": [("ns.gtld.net.", "A", TLD)],
            },
            (TLD, "a.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("a.com.", "NS", "ns.a.com.")],
                "additional": [("ns.a.com.", "A", AUTH)],
            },
            (AUTH, "a.com."): _ans([("a.com.", "A", "1.1.1.1")]),
        })
        self.assertEqual(resolve("a.com", send_query), "1.1.1.1")


if __name__ == '__main__':
    unittest.main()
`;

/* ---------------------------------------------------------------- L4 ---- */

const SOL_4 = `ROOT_IP = "198.41.0.4"
MAX_QUERIES = 200


class _NXDomain(Exception):
    """Definitive NXDOMAIN -> abort sibling NS attempts."""


class _OutOfBudget(Exception):
    """Total query cap exceeded -> give up (loop guard)."""


def normalize(name):
    stripped = name.strip().lower().rstrip('.')
    return stripped + '.' if stripped else '.'


def _find_a(response, name):
    for owner, rtype, value in response["answers"]:
        if rtype == "A" and normalize(owner) == name:
            return value
    return None


def _find_cname(response, name):
    for owner, rtype, value in response["answers"]:
        if rtype == "CNAME" and normalize(owner) == name:
            return normalize(value)
    return None


def _glue_ip(response, ns_name):
    ns_name = normalize(ns_name)
    for owner, rtype, value in response["additional"]:
        if rtype == "A" and normalize(owner) == ns_name:
            return value
    return None


def _make_query(send_query, cache, budget):
    # Wrap the raw network so repeats are served from a SHARED cache and the
    # total number of real queries is capped (the cycle/loop guard).
    def query(name, server_ip):
        key = (server_ip, name)
        if key in cache:
            return cache[key]
        if budget[0] <= 0:
            raise _OutOfBudget()
        budget[0] -= 1
        response = send_query(name, server_ip)
        cache[key] = response
        return response
    return query


def _resolve(name, server_ip, query, root_ip, seen):
    if (server_ip, name) in seen:
        return None  # already visited on this path -> cycle
    seen = seen | {(server_ip, name)}

    response = query(name, server_ip)
    status = response["status"]
    if status == "NXDOMAIN":
        raise _NXDomain()
    if status != "NOERROR":
        return None

    ip = _find_a(response, name)
    if ip is not None:
        return ip

    cname = _find_cname(response, name)
    if cname is not None:
        return _resolve(cname, root_ip, query, root_ip, seen)

    for owner, rtype, ns_name in response["authority"]:
        if rtype != "NS":
            continue
        ns_name = normalize(ns_name)
        glue = _glue_ip(response, ns_name)
        if glue is None:
            glue = _resolve(ns_name, root_ip, query, root_ip, seen)
            if glue is None:
                continue
        result = _resolve(name, glue, query, root_ip, seen)
        if result is not None:
            return result
    return None


def resolve(name, send_query, root_ip=ROOT_IP):
    cache = {}
    budget = [MAX_QUERIES]
    query = _make_query(send_query, cache, budget)
    try:
        return _resolve(normalize(name), root_ip, query, root_ip, frozenset())
    except (_NXDomain, _OutOfBudget):
        return None


def resolve_all(names, send_query, root_ip=ROOT_IP):
    # Resolve a batch behind ONE shared cache: a (server, name) query that any
    # name in the batch already triggered is never sent to the network again.
    cache = {}
    budget = [MAX_QUERIES * len(names) + MAX_QUERIES]
    query = _make_query(send_query, cache, budget)
    results = {}
    for raw in names:
        name = normalize(raw)
        try:
            results[name] = _resolve(name, root_ip, query, root_ip, frozenset())
        except (_NXDomain, _OutOfBudget):
            results[name] = None
    return results
`;

const TESTS_4 = `import unittest
from solution import resolve, resolve_all

ROOT = "198.41.0.4"


def make_network(table):
    calls = []

    def send_query(name, server_ip):
        calls.append((server_ip, name))
        return table[(server_ip, name)]

    return send_query, calls


def _ans(records):
    return {"status": "NOERROR", "answers": records, "authority": [], "additional": []}


def _delegate(ns_name, ns_ip):
    return {
        "status": "NOERROR", "answers": [],
        "authority": [("com.", "NS", ns_name)],
        "additional": [(ns_name, "A", ns_ip)],
    }


class Level4Tests(unittest.TestCase):
    def testLevel4_resolve_all_basic(self):
        A1, A2 = "10.0.0.1", "10.0.0.2"
        send_query, _ = make_network({
            (ROOT, "a.com."): _delegate("ns.a.com.", A1),
            (A1, "a.com."): _ans([("a.com.", "A", "1.1.1.1")]),
            (ROOT, "b.com."): _delegate("ns.b.com.", A2),
            (A2, "b.com."): _ans([("b.com.", "A", "2.2.2.2")]),
        })
        self.assertEqual(
            resolve_all(["a.com", "B.COM"], send_query),
            {"a.com.": "1.1.1.1", "b.com.": "2.2.2.2"},
        )

    def testLevel4_resolve_all_unresolvable_is_none(self):
        send_query, _ = make_network({
            (ROOT, "a.com."): _ans([("a.com.", "A", "1.1.1.1")]),
            (ROOT, "gone.com."): {
                "status": "NXDOMAIN", "answers": [], "authority": [], "additional": [],
            },
        })
        self.assertEqual(
            resolve_all(["a.com", "gone.com"], send_query),
            {"a.com.": "1.1.1.1", "gone.com.": None},
        )

    def testLevel4_batch_shares_cache_for_repeated_name(self):
        A1 = "10.0.0.1"
        send_query, calls = make_network({
            (ROOT, "a.com."): _delegate("ns.a.com.", A1),
            (A1, "a.com."): _ans([("a.com.", "A", "1.1.1.1")]),
        })
        # the same name twice -> the network is touched once per (server, name)
        result = resolve_all(["a.com", "a.com"], send_query)
        self.assertEqual(result, {"a.com.": "1.1.1.1"})
        self.assertEqual(len(calls), 2)  # (ROOT, a.com.) and (A1, a.com.) -- not 4

    def testLevel4_resolve_handles_delegation_cycle(self):
        # Two servers delegate the same name back and forth forever.
        X, Y = "9.0.0.1", "9.0.0.2"
        send_query, _ = make_network({
            (ROOT, "loop.com."): _delegate("ns.x.", X),
            (X, "loop.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("loop.com.", "NS", "ns.y.")],
                "additional": [("ns.y.", "A", Y)],
            },
            (Y, "loop.com."): {
                "status": "NOERROR", "answers": [],
                "authority": [("loop.com.", "NS", "ns.x.")],
                "additional": [("ns.x.", "A", X)],
            },
        })
        # must terminate and return None, not hang
        self.assertIsNone(resolve("loop.com", send_query))

    def testLevel4_single_resolve_still_works(self):
        A1 = "10.0.0.1"
        send_query, _ = make_network({
            (ROOT, "a.com."): _delegate("ns.a.com.", A1),
            (A1, "a.com."): _ans([("a.com.", "A", "1.1.1.1")]),
        })
        self.assertEqual(resolve("a.com", send_query), "1.1.1.1")


if __name__ == '__main__':
    unittest.main()
`;

export default {
  id: "mock-dns-4",
  title: "DNS Resolver (Black Box) — 4-level Mock",
  domain: "Networking · Black-Box Resolver",
  kind: "exam",
  track: "core",
  implFile: "solution.py",
  pointsPerLevel: 250,
  blurb:
    "exam-faithful 4-level mock of the hand-written DNS resolver online assessment. " +
    "Iterative delegation → CNAME restart-from-root → missing glue + NXDOMAIN/NS-fallback → loop guard + cached batch. " +
    "The network is a BLACK BOX: you may only call the injected send_query(name, server_ip) and parse the response dict it returns. " +
    "Mirrors curriculum modules m46 (Resolver & Black-Box Mastery) and m47 (DNS Resolver — The Online Assessment, Step by Step).",
  starterCode: STARTER,
  levels: [
    {
      n: 1, title: "Iterative Resolution", points: 250, mode: "sync",
      changed: "Walk the delegation chain yourself: root → TLD → authoritative, following NS records via their glue IPs.",
      spec: `# Level 1 — Iterative Resolution

DNS turns a name like \`WWW.Example.com\` into an IP. Real resolution is **iterative**: you start at a known **root server IP** and walk the chain of nameservers yourself, one query at a time.

**The black box.** The network is **passed in** as \`send_query(name, server_ip)\`. It is the only way to touch the network — you may **call** it and **parse the dict it returns**, nothing more. Every response is shaped:

\`\`\`python
{"status": "NOERROR" | "NXDOMAIN" | "REFUSED",
 "answers":    [(name, "A" | "AAAA" | "CNAME", value), ...],
 "authority":  [(zone, "NS", ns_name), ...],
 "additional": [(ns_name, "A", ip), ...]}   # "glue": the nameservers' IPs
\`\`\`

Write \`resolve(name, send_query, root_ip="198.41.0.4")\`:

1. **Normalize** the name first — lowercase with exactly one trailing dot (\`WWW.Example.com\` → \`www.example.com.\`). Re-normalize every name a response hands back before comparing it.
2. Start at \`root_ip\`. Loop: \`send_query(name, server_ip)\`.
   - If \`status\` is not \`"NOERROR"\`, return \`None\`.
   - If \`answers\` has an **A** record whose owner equals your name, return its IP. **Done.**
   - Otherwise it is a **referral**: find the first \`NS\` record in \`authority\`, look up that nameserver's IP in the \`additional\` **glue** (match on normalized name), set it as the next \`server_ip\`, and continue.
   - If there is no answer and no usable glue, return \`None\`.

> The query **name never changes** as you descend — only the \`server_ip\` you send it to. (Level 1: every referral has glue, and status is always \`NOERROR\` or \`NXDOMAIN\`.)`,
      tests: TESTS_1, solution: SOL_1,
    },
    {
      n: 2, title: "CNAME Aliases", points: 250, mode: "sync",
      changed: "A CNAME answer is an alias, not an address: re-normalize its target and **restart resolution from the root**.",
      spec: `# Level 2 — CNAME Aliases

A **CNAME** record means *“this name is an alias; its real name is X.”* When the answer for the name you asked about is a **CNAME**, you do **not** keep walking with the old name. You take the canonical target, **normalize it** (it is untrusted input — it may arrive as \`A.COM\`), and **restart resolution from the root** with the new name.

Extend \`resolve\` so that, when scanning a \`NOERROR\` response:

- An **A** record for your name → return its IP (as in Level 1).
- A **CNAME** record for your name → adopt the normalized target as the new name, reset the server back to \`root_ip\`, and continue. Aliases can **chain** (\`www\` → \`web\` → \`host\`), so you may restart several times before landing on an A record.
- Otherwise, follow the NS delegation exactly as in Level 1.

\`\`\`
www.a.com.  --CNAME-->  a.com.   (restart from root)
a.com.      --A------>  1.1.1.1  (done)
\`\`\`

> Level 1 resolutions (no CNAME) must keep passing unchanged.`,
      tests: TESTS_2, solution: SOL_2,
    },
    {
      n: 3, title: "Missing Glue, NXDOMAIN & NS Fallback", points: 250, mode: "sync",
      changed: "**Robustness land.** Resolve a nameserver that arrived without glue; treat NXDOMAIN as definitive; fall back to the next NS on a server failure.",
      spec: `# Level 3 — Missing Glue, NXDOMAIN & NS Fallback

Real referrals are not always tidy. Three new cases — each is a branch on what the black box returns.

**1 · Missing glue.** A referral can name a nameserver in \`authority\` but provide **no A record** for it in \`additional\`. You cannot query an IP you do not have, so you must **resolve that nameserver's own name first** — run a full resolution for \`ns_name\` starting from \`root_ip\` — then use the IP you get back to continue resolving the original name.

**2 · NXDOMAIN is definitive.** If any server answers \`status == "NXDOMAIN"\`, the name **does not exist**. Stop and return \`None\` — do **not** try other nameservers.

**3 · NS fallback on a soft failure.** If a server returns \`"REFUSED"\`/\`"SERVFAIL"\` (any non-\`NOERROR\`, non-\`NXDOMAIN\` status) or simply dead-ends, that **server** failed — not the name. Try the **next** \`NS\` record in the \`authority\` list. Only when **every** nameserver has been exhausted do you return \`None\`.

> Together these mean delegation is a **search with backtracking**: walk each candidate nameserver in order, resolving missing glue as needed, and accept the first one that yields an answer. NXDOMAIN short-circuits the whole search; a soft failure only skips that one server.
>
> Levels 1–2 behavior must be unchanged.`,
      tests: TESTS_3, solution: SOL_3,
    },
    {
      n: 4, title: "Loop Guard & Cached Batch", points: 250, mode: "sync",
      changed: "Capstone — make cycles terminate (a query cap / visited-path guard) and add a batch resolver behind one shared cache.",
      spec: `# Level 4 — Loop Guard & Cached Batch

Two final pieces.

**1 · Loop guard.** Misconfigured zones can delegate in a **cycle** — server X refers your name to Y, Y refers it back to X — or alias chains can loop. A naive resolver hangs forever. Make resolution **terminate**: never re-query the same \`(server_ip, name)\` pair on a single resolution path, and/or **cap the total number of queries**. When the guard trips, give up and return \`None\`. \`resolve\` must return \`None\` (not hang) on a delegation cycle.

**2 · Cached batch.** Add:

- \`resolve_all(names, send_query, root_ip="198.41.0.4")\` — resolve a **list** of names and return a dict mapping each **normalized** name to its resolved IP (or \`None\`). Use **one shared response cache** across the whole batch: any \`(server_ip, name)\` query already made by an earlier name is served from the cache instead of hitting \`send_query\` again. A repeated name in the list therefore costs **zero** extra network calls.

\`\`\`
resolve_all(["a.com", "B.COM"], send_query)
  -> {"a.com.": "1.1.1.1", "b.com.": "2.2.2.2"}
\`\`\`

> The single-name \`resolve\` from Levels 1–3 must keep working — wrap the same machinery; the cache and loop guard are additive.`,
      tests: TESTS_4, solution: SOL_4,
    },
  ],
};
