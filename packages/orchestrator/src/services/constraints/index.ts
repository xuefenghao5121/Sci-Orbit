export { ConstraintEngine } from "./engine.js";
export type { CheckReport, DimensionCheckResult, ConservationCheckResult, RangeCheckResult, CodeCheckResult } from "./engine.js";
export { SI_DIMENSIONS, DERIVED_QUANTITIES, CONSERVATION_LAWS } from "./rules/physics-rules.js";
export { COMMON_ELEMENTS, checkChemicalBalance } from "./rules/chemistry-rules.js";
export { checkNaNInf, checkStability, checkConvergence, checkEnergyConservation, runNumericalChecks } from "./rules/numerical-rules.js";
export type { NumericalCheckResult } from "./rules/numerical-rules.js";
export { checkCodeSecurity, checkCodeQuality, runAllCodeChecks } from "./rules/code-rules.js";
export type { CodeIssue, CodeRuleCheckResult } from "./rules/code-rules.js";
