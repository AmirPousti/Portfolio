/** Constant-parameter CRR European call. Values are index points, not contract prices. */
export function priceCall({spot, strike, rate, volatility, years, steps}) {
  if (![spot, strike, rate, volatility, years].every(Number.isFinite)
      || spot <= 0 || strike <= 0 || volatility <= 0 || years <= 0
      || ![1, 2].includes(steps)) {
    throw new RangeError('Use finite positive inputs and a one- or two-step tree.');
  }
  const dt = years / steps;
  const up = Math.exp(volatility * Math.sqrt(dt));
  const down = 1 / up;
  const growth = Math.exp(rate * dt);
  const probability = (growth - down) / (up - down);
  if (![up, down, growth, probability].every(Number.isFinite)
      || down === up || growth <= 0 || probability < 0 || probability > 1) {
    throw new RangeError('The tree does not satisfy the no-arbitrage condition.');
  }
  // nodes[step][upMoves]; a recombining tree with backward-inducted call values.
  const nodes = Array.from({length: steps + 1}, (_, step) =>
    Array.from({length: step + 1}, (_, upMoves) => ({
      step, upMoves,
      underlying: spot * up ** upMoves * down ** (step - upMoves),
      value: 0,
    })));
  for (const node of nodes[steps]) node.value = Math.max(node.underlying - strike, 0);
  for (let step = steps - 1; step >= 0; step--) {
    for (const node of nodes[step]) {
      node.value = (probability * nodes[step + 1][node.upMoves + 1].value
        + (1 - probability) * nodes[step + 1][node.upMoves].value) / growth;
    }
  }
  if (nodes.flat().some(node => !Number.isFinite(node.value) || !Number.isFinite(node.underlying))) {
    throw new RangeError('The inputs exceed the supported numerical range.');
  }
  return {price: nodes[0][0].value, probability, up, down, growth, dt, nodes};
}
