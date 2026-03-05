const aliasesArray = [
    { aliases: [] },
    { aliases: ['name', 'full name'] },
    { aliases: ['email'] }
];

const sorted = [...aliasesArray].sort((a, b) =>
    Math.max(...b.aliases.map((x) => x.length)) - Math.max(...a.aliases.map((x) => x.length))
);

console.log("Sorted:", sorted);

const a2 = [
    { aliases: ['name', 'full name'] },
    { aliases: ['email'] }
];

const sorted2 = [...a2].sort((a, b) =>
    Math.max(...b.aliases.map((x) => x.length)) - Math.max(...a.aliases.map((x) => x.length))
);

console.log("Sorted2:", sorted2);
