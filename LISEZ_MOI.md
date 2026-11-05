# SM

Appli web installable de Shaina et Marcus. Aucune dépendance à installer, aucune clé secrète.

- `index.html`, `styles.css`, `app.js` : l'appli.
- `sw.js`, `manifest.webmanifest` : installation sur le téléphone et mode hors ligne.
- `data/quotes.json` : les cours, mis à jour par `tools/update_quotes.py`.
- `.github/workflows/cours.yml` : met les cours à jour chaque soir sur GitHub.

Après une modification, changer `CACHE` dans `sw.js` pour que les téléphones reçoivent la nouvelle version.
