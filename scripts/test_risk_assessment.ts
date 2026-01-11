
// Mock Browser Environment for Node Test
if (typeof localStorage === 'undefined' || typeof window === 'undefined') {
    const mockStorage = {
        getItem: () => null,
        setItem: () => { },
        removeItem: () => { },
        length: 0
    };
    (global as any).localStorage = mockStorage;
    (global as any).window = {
        dispatchEvent: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        localStorage: mockStorage
    };
    (global as any).document = {
        elementFromPoint: () => null
    }
}

async function runTest() {
    // Dynamic import to allow mocks to apply first
    const { selfEvolution } = await import('../services/selfEvolution');

    console.log("------------------------------------------");
    console.log("🚦 SENTIENT CODE EDITING: Risk Assessment");
    console.log("------------------------------------------");

    const target = 'store.ts';
    console.log(`\n🤖 User Request: 'I want to refactor ${target}.'`);
    console.log(`... Analyzing Blast Radius ...`);

    const risk = selfEvolution.assessImpact(target);

    console.log(`\n📋 ANALYSIS RESULT for ${target}:`);
    console.log(`   RISK LEVEL: [ ${risk} ]`);

    if (risk === 'HIGH') {
        console.log(`\n🚨 CRITICAL WARNING: Modification of '${target}' is DANGEROUS.`);
        console.log(`   It impacts >20 downstream components.`);
        console.log(`   Requires manual architectural review before proceeding.`);
    } else if (risk === 'MEDIUM') {
        console.log(`\n⚠️ CAUTION: Ensure unit tests pass.`);
    } else {
        console.log(`\n✅ APPROVED: Low impact change.`);
    }

    console.log("------------------------------------------");
}

runTest();
