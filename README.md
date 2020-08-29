# Import EWR Airport Stats to Microprediction

This module imports various operational statistics from Newark Airport's website into
Microprediction.org.

## Loaded Data

The data is sourced from various URLs provided publically by Newark Airport.

## Implementation Details

There is a single Lambda function that is run as a scheduled
CloudWatch Event every minute pull new data. This function
is created using webpack to amalgamate the various imported modules.

It runs in about 2 seconds or less every minute.

The write keys are not included in this repo.
