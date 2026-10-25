// All monetary inputs from Excel are € thousand, except price per share.
export function calculateDCF(model, wacc, growth) {
  if (![wacc, growth].every(Number.isFinite) || wacc <= growth || wacc <= -1 || growth <= -1) {
    throw new RangeError('WACC must exceed terminal growth, and both rates must be finite.');
  }
  if (model.cashFlows.length !== 10 || !model.cashFlows.every(Number.isFinite)
      || !Number.isFinite(model.shares) || model.shares <= 0
      || ![model.rollForward, model.netDebtAdjustment, model.nciAdjustment].every(Number.isFinite)) {
    throw new RangeError('The source model contains invalid inputs.');
  }
  const cashFlowPV = model.cashFlows.reduce((total, flow, index) =>
    total + flow * Math.pow(1 + wacc, model.rollForward - index - 1), 0);
  const terminalPV = model.cashFlows[9] * (1 + growth) / (wacc - growth)
    * Math.pow(1 + wacc, model.rollForward - 10);
  const enterpriseValue = cashFlowPV + terminalPV;
  const equityValue = enterpriseValue + model.netDebtAdjustment + model.nciAdjustment;
  const price = equityValue * 1000 / model.shares;
  if (![price, terminalPV, cashFlowPV, enterpriseValue].every(Number.isFinite)) {
    throw new RangeError('This combination does not produce a finite valuation.');
  }
  return {price, cashFlowPV, terminalPV, enterpriseValue, equityValue,
    terminalShare: terminalPV / enterpriseValue};
}

export function difference(value, reference) {
  if (![value, reference].every(Number.isFinite) || reference === 0) {
    throw new RangeError('A finite, non-zero reference is required.');
  }
  return {absolute: value - reference, percent: (value / reference - 1) * 100};
}
