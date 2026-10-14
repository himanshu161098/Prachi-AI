# ML Forecasting Specification

## Model lifecycle

data contract -> preprocessing -> train -> validate -> register -> deploy -> monitor

## Prediction response

Include:
- prediction;
- unit/meaning;
- model version;
- data timestamp/range;
- confidence or uncertainty measure where supported;
- known limitations.

Never represent a model estimate as certain future knowledge.
