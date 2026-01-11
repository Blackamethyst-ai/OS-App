
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
    console.log("🛡️  SAFE EVOLUTION: Migration Planning");
    console.log("------------------------------------------");

    // Target a probable medium/high risk file.
    // 'ApiKeyService' is used by a few things but not everything.
    // 'BiometricAnchor' is a component.
    const target = 'components/BiometricAnchor.tsx'; // Adjust if file doesn't exist, will fallback to high risk if not found.
    // Let's use a real file we know exists. index.css is small.
    // let's try 'types.ts' - likely high risk.
    // Let's try 'hooks/useBiometricSensor.ts'

    // We want to demonstrate "medium" risk ideally.
    // Let's try 'utils/cn.ts' (used by many components)

    const targetFile = 'types.ts';

    console.log(`\n🤖 User Request: 'Refactor ${targetFile} to add new types.'`);
    console.log(`... Consulting Graph Reasoner ...`);

    const plan = selfEvolution.proposeMigration(targetFile, "dummy change");

    console.log(`\n📜 MIGRATION PLAN GENERATED:`);
    console.log(`   TARGET: ${plan.target}`);
    console.log(`   RISK LEVEL: ${plan.risk}`);
    console.log(`   STATUS: ${plan.status}`);

    if (plan.impactedFiles.length > 0) {
        console.log(`\n   IMPACTED FILES (${plan.impactedFiles.length}):`);
        plan.impactedFiles.slice(0, 15).forEach(f => console.log(`    - ${f}`));
        if (plan.impactedFiles.length > 15) console.log(`    ... and ${plan.impactedFiles.length - 15} more.`);
    }

    if (plan.status === 'AUTO_GENERATING_PATCHES') {
        console.log(`\n✨ PLAN APPROVED FOR AUTO-EVOLUTION.`);
        console.log(`   The OS is now generating patches for all ${plan.impactedFiles.length} dependent files.`);
    } else if (plan.status === 'MANUAL_APPROVAL_REQUIRED') {
        console.log(`\n🛑 PLAN HALTED.`);
        console.log(`   Too many dependencies. Human review required.`);
    }

    console.log("------------------------------------------");
}

runTest();
