// Math and Algorithm Verification Tests
// Run directly using ts-node or deno run

// 1. Proration Billing Math
interface ProrationInput {
  oldPrice: number;
  oldDurationDays: number;
  remainingDays: number;
  newPrice: number;
}

function calculateProratedUpgrade(input: ProrationInput): {
  proratedCredit: number;
  amountDue: number;
} {
  const dailyRate = input.oldPrice / input.oldDurationDays;
  const proratedCredit = parseFloat((input.remainingDays * dailyRate).toFixed(2));
  const amountDue = parseFloat((input.newPrice - proratedCredit).toFixed(2));
  return { proratedCredit, amountDue };
}

// 2. BMR & Macro targets calculations
interface MacroInput {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: "MALE" | "FEMALE";
  activityFactor: number; // e.g. 1.55
  calorieDeficitPct: number; // e.g. 20 (for 20% deficit)
}

interface MacroOutput {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

function calculateMacros(input: MacroInput): MacroOutput {
  // Mifflin-St Jeor
  const genderOffset = input.gender === "MALE" ? 5 : -161;
  const bmr = (10 * input.weightKg) + (6.25 * input.heightCm) - (5 * input.age) + genderOffset;
  const tdee = bmr * input.activityFactor;
  
  const targetCalories = tdee * (1 - (input.calorieDeficitPct / 100));
  
  // Rules:
  // - Protein: 2.0g per kg of bodyweight
  const proteinG = input.weightKg * 2;
  const proteinKcal = proteinG * 4;
  
  // - Fat: 25% of target calories
  const fatKcal = targetCalories * 0.25;
  const fatG = parseFloat((fatKcal / 9).toFixed(1));
  
  // - Carbs: Fill the remaining caloric targets
  const carbsKcal = targetCalories - proteinKcal - fatKcal;
  const carbsG = parseFloat((carbsKcal / 4).toFixed(1));
  
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    proteinG,
    fatG: Math.round(fatG),
    carbsG: Math.round(carbsG),
  };
}

// Assertions Engine
function runTests() {
  console.log("Starting Technical Architecture Math Verification Tests...");

  // Test Case 1: Proration Upgrades Math
  const prorationResult = calculateProratedUpgrade({
    oldPrice: 100,
    oldDurationDays: 30,
    remainingDays: 10,
    newPrice: 150,
  });
  
  console.assert(prorationResult.proratedCredit === 33.33, `Expected credit 33.33, got ${prorationResult.proratedCredit}`);
  console.assert(prorationResult.amountDue === 116.67, `Expected amount due 116.67, got ${prorationResult.amountDue}`);
  console.log("✓ Proration upgrade calculation tests passed.");

  // Test Case 2: BMR/TDEE & Macros splits
  const macrosResult = calculateMacros({
    weightKg: 80,
    heightCm: 180,
    age: 30,
    gender: "MALE",
    activityFactor: 1.55,
    calorieDeficitPct: 20,
  });

  console.assert(macrosResult.bmr === 1780, `Expected BMR 1780, got ${macrosResult.bmr}`);
  console.assert(macrosResult.tdee === 2759, `Expected TDEE 2759, got ${macrosResult.tdee}`);
  console.assert(macrosResult.targetCalories === 2207, `Expected target calories 2207, got ${macrosResult.targetCalories}`);
  console.assert(macrosResult.proteinG === 160, `Expected protein 160g, got ${macrosResult.proteinG}`);
  console.assert(macrosResult.fatG === 61, `Expected fat 61g, got ${macrosResult.fatG}`);
  console.assert(macrosResult.carbsG === 254, `Expected carbs 254g, got ${macrosResult.carbsG}`);
  console.log("✓ Mifflin-St Jeor TDEE & macro splits calculation tests passed.");
  
  console.log("All validation tests successfully passed!");
}

runTests();
