# CHANGE LOG

## 1.3.5

- Boolean data from DB actually converts to JS booleans now

## 1.3.4

- crud's `transactionSelect` and `transactionSelectWhere` now use correct arguments

## 1.3.3

- Null data no longer breaks decryption

## 1.3.2

- Crud now uses global passphrase as a default

## 1.3.1

- Fixes an argument order issue in column validator

## 1.3.0

- Add application layer encryption

## 1.2.10

- col/val validator is completely case insensitive

## 1.2.9

- inputs and updates lowercase table/struct props

## 1.2.8

- typegen only forces lowercase on props, excluding the collection interface

## 1.2.7

- typegen interfaces are now cased according to schema, but sql props
remain lowercase, better usability

## 1.2.6

- typegen schema name output is now all lowercase

## 1.2.5

- Update function increments the placeholder counter

## 1.2.4

- Update function actually isolates the idProps

## 1.2.3

- Fix error in update typings

## 1.2.2

- Adds @types/pg as a full on dependency so TS consumers get the types

## 1.2.1

- Expose public types sql-tables depends on from `pg` library

## 1.2.0

- generate typescript now produces a summary interface

## 1.1.1

- strictify the schema in the CLI tool

## 1.1.0

- generate typescript "binary"

## 1.0.1

- transactionEnd now releases connection
- transactionRollback now releases connection

## 1.0.0

- state is now contained
- documentation updated
- rxjs updated

