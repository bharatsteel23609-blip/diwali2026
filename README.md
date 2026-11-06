# BSC Diwali Games Scorekeeper (Vercel + Neon)

Files
- public/index.html   the app
- public/db-shim.js   connects the app to the API (checks for changes every 2.5 seconds)
- api/db.js           serverless API that reads and writes Neon Postgres
- schema.sql          the table (the API also creates it automatically)

## Deploy steps

1. GitHub: create a new repository (private is fine) and upload all these files,
   keeping the folders (api, public) as they are. Or: git init, git add ., git commit, git push.
2. Vercel: vercel.com > Add New > Project > import the repository.
   Leave every setting as default (Framework: Other). Do not click Deploy yet.
3. Neon database: in the same Vercel project open Storage > Create Database > Neon
   (Postgres) > create it and connect it to the project. This adds the DATABASE_URL
   environment variable automatically.
   Without the integration: create a project at neon.tech, copy the connection string,
   and add it in Vercel > Settings > Environment Variables as DATABASE_URL.
4. Click Deploy. When it finishes, open the project URL.
5. Test: open the link on two phones. The top of the app should say "Live sync".
   Mark a test player on one phone and check it appears on the other within 3 seconds.
   Then use Setup > reset to clear the test data before the event.

## On the day
- Share the Vercel link with everyone who is scoring. No sign-in is needed.
- Give each scorer their own game so two people do not edit the same game.
- If the chip says "This phone only", the API could not be reached.
  Check that DATABASE_URL is set, then redeploy.

## Notes
- Anyone with the link can change scores. Share it only with your scorers.
- To start fresh: Setup > reset, or run: DELETE FROM docs; in the Neon SQL editor.
