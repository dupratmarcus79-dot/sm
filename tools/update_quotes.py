#!/usr/bin/env python3
"""Écrit data/quotes.json : un an de cours journaliers. Aucune clé, aucune dépendance."""
import datetime, json, os, urllib.parse, urllib.request

ACTIFS = [
    ("^FCHI", "CAC 40", "Indice", "indice"), ("^GSPC", "S&P 500", "Indice", "indice"),
    ("^IXIC", "Nasdaq", "Indice", "indice"), ("CW8.PA", "MSCI World", "ETF", "etf"),
    ("BTC-EUR", "Bitcoin", "Crypto", "crypto"), ("ETH-EUR", "Ethereum", "Crypto", "crypto"),
    ("GC=F", "Or", "Matière première", "matiere"), ("EURUSD=X", "EUR / USD", "Devise", "devise"),
    ("AAPL", "Apple", "Action", "action"), ("MBG.DE", "Mercedes-Benz", "Action", "action"),
    ("ONON", "On Holding", "Action", "action"), ("MC.PA", "LVMH", "Action", "action"),
    ("AI.PA", "Air Liquide", "Action", "action"), ("TTE.PA", "TotalEnergies", "Action", "action"),
]
ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "..", "data", "quotes.json")


def cours(symbole):
    url = "https://query1.finance.yahoo.com/v8/finance/chart/" + urllib.parse.quote(symbole) + "?range=1y&interval=1d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (SM app quotes)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        res = json.load(r)["chart"]["result"][0]
    fermes = res["indicators"]["quote"][0]["close"]
    serie = [[datetime.datetime.utcfromtimestamp(t).strftime("%Y-%m-%d"), round(c, 4)]
             for t, c in zip(res["timestamp"], fermes) if c is not None]
    return serie, res["meta"].get("currency", "")


def main():
    sortie, erreurs = [], []
    for symbole, nom, type_, famille in ACTIFS:
        try:
            serie, devise = cours(symbole)
            sortie.append({"id": symbole, "nom": nom, "type": type_, "famille": famille, "devise": devise, "serie": serie})
        except Exception as e:
            erreurs.append(symbole)
            print("échec", symbole, e)
    if len(sortie) < len(ACTIFS) // 2:
        raise SystemExit("Trop d'échecs : on garde l'ancien fichier.")
    with open(SORTIE, "w", encoding="utf-8") as f:
        json.dump({"maj": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "actifs": sortie}, f, ensure_ascii=False, separators=(",", ":"))
    print(len(sortie), "actifs écrits", "manquants:", erreurs)


if __name__ == "__main__":
    main()
