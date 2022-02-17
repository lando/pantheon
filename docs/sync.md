---
title: Syncing
description: Learn how to sync databases, files, relationships and mounts between your local Lando site and your remote Pantheon site.
---

# Syncing

Lando also provides wrapper commands called `lando pull` and `lando push`.

With `lando pull` you can import data and download files from your remote Pantheon site. With `lando push` you can do the opposite, export data or upload files to your remote Pantheon site.

Note that only database relationships are currently syncable.

## Importing Your Database and Files

Once you've started up your Pantheon, site you will need to pull in your database and files before you can really start to dev all the dev. There are two easy ways to do this as shown below:

### 1. Using `lando pull`

Lando provides a command for Pantheon sites called `lando pull` to get your database and files.

**If you do not specify `--code`, `--database` or `--files` then `lando` will use the environment associated with your currently checked out `git branch`.**

On a database pull, Lando will attempt to clear the cache of the remote environment (unless it is the live environment) to minimize the size of the import.

Note that if Lando cannot find a [Pantheon machine token](https://pantheon.io/docs/machine-tokens/) associated with your site, it will prompt you for one. You can also switch to a different machine token by using the  `--auth` option.

#### Usage

```bash
# Pull the latest code, database and files
# This will pull the environment associated with your currently checked out git branch
lando pull

# Skip a code merge
lando pull --code=none

# Pull only the database from the test environment
lando pull --database=test --files=none

# Pull only the files
lando pull --database=none

# Pull only the latest files without grabbing a files backup
lando pull --database=none --rsync

# Do the above but with different auth
lando pull --auth "$PANTHEON_MACHINE_TOKEN" --database=none --rsync
```

#### Options

```bash
--auth          Pantheon machine token
--clear         Clears the lando tasks cache
--code, -c      The environment from which to pull the code
--database, -d  The environment from which to pull the database
--files, -f     The environment from which to pull the files
--help          Shows lando or delegated command help if applicable
--rsync         Rsync the files, good for subsequent pulls
--verbose, -v   Runs with extra verbosity
```

Please consult the manual import documentation below if this command produces an error.

### 2. Manually Importing Your DB and Files

You will want to the replace `MYSITE` and `MYENV` below with the Pantheon site and environment from which you want to import.

#### Database

```bash
# Remove lingering DB dumps
lando ssh -c "rm -f /app/database.sql.gz"

# Create a new backup of your database
# If you've created a db backup recently this step is not needed.
lando terminus backup:create MYSITE.MYENV --element=db

# Download and import backup of the database
lando terminus backup:get MYSITE.MYENV --element=db --to=/app/database.sql.gz
lando db-import database.sql.gz
```

You can learn more about the `db-import` command [over here](https://docs.lando.dev/guides/db-import.html).

#### Files

```bash
# Remove the DB dump
lando ssh -c "rm -f /tmp/files.sql.gz"

# Create a new backup of your files
# If you've created a files backup recently this step is not needed.
lando terminus backup:create MYSITE.MYENV --element=files

# Download and extract backup of the files
lando terminus backup:get MYSITE.MYENV --element=files --to=/tmp/files.tar.gz
# Import your files
# Please be aware the following paths are not valid if you are using a nested webroot in your Pantheon recipe.

#Drupal
lando ssh -c "mkdir -p /app/sites/default/files"
lando ssh -c "tar -xzvf /tmp/files.tar.gz -C /app/sites/default/files --strip-components 1"

#Backdrop
lando ssh -c "mkdir -p /app/files"
lando ssh -c "tar -xzvf /tmp/files.tar.gz -C /app/files --strip-components 1"

#WordPress
lando ssh -c "mkdir -p /app/wp-content/uploads"
lando ssh -c "tar -xzvf /tmp/files.tar.gz -C /app/wp-content/uploads --strip-components 1"
```

You can alternatively download the backup and manually extract it to the correct location.

## Pushing Your Changes

While a best practices workflow suggests you put all your changes in code and push those changes with `git`, Lando provides a utility command for `pantheon` recipes called `lando push` that pushes up any code, database or files changes you have made locally.

**By default, we set `--database` or `--files` to `none` since this is the suggested best practice**.

Note that if Lando cannot find a [Pantheon machine token](https://pantheon.io/docs/machine-tokens/) associated with your site, it will prompt you for one. You can also switch to a different machine token by using the  `--auth` option.


### Usage

```bash
# Push the latest code, database and files
# This will push the environment associated with your currently checked out git branch
lando push

# Push the latest code, database and files with a description of the change
lando push -m "Updated the widget to do awesome thing x"

# Push only the database and code
lando push --files=none

# Push only the files and code
lando push

# Do the above but with different auth
lando push --auth "$PANTHEON_MACHINE_TOKEN" --database=none
```

### Options

```bash
--auth          Pantheon machine token
--clear         Clears the lando tasks cache
--code, -c      The environment to which the code will be pushed
--database, -d  The environment to which the database will be pushed
--files, -f     The environment to which the files will be pushed
--help          Shows lando or delegated command help if applicable
--message, -m   A message describing your change
--verbose, -v   Runs with extra verbosity
```