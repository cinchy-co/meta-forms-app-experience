/**
 * Used to extract the name of an affected column from an error message in the case that a column listed in a CQL query
 * is not available.
 *
 * On MSSQL: `The column [COLUMN_NAME] could not be found` -> [`[COLUMN_NAME]`]
 *
 * On Aurora: `The column "COLUMN_NAME" could not be found` -> [`"COLUMN_NAME"`]
 */
export const REGEX_COLUMN_NAME_IN_ERROR = /(?:\[([^\[\]]+)])|(?:"([a-zA-Z0-9\s]+)")/g;
