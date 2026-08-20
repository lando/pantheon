# Examples

Pantheon example sites that clone a remote (`landobot-*` via `lando init --source pantheon`) use **`master`**, not `main`.

- Inspect or change those remotes on `master`.
- Do not `git clone` the default branch and assume it is current. `main` can exist and be stale or empty of site config.
- Change remote site code the same way the example READMEs do: `lando init` → edit → `lando push --code dev`. That checks out `master` and pushes it.
- After applying code/dependency updates on a remote Drupal example: `lando drush updb -y`, then `lando drush cex -y`, then `lando push --code dev`. Do not skip the config export.
- When teardown is done, `lando destroy -y` the local app. Do not leave a landobot example running.
- Never run `lando init` inside the example directory itself. Init into a nested work dir (as the READMEs do) so the cloned site does not overwrite the example.

Local-only examples (`frontend-build`, `pantheon-php-warning`, downstreamers) have no Pantheon remote and do not use this branch rule.
