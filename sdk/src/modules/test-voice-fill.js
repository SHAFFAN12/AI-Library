const aliases = ['name'];
const rest = 'my name john';

let matched, value;

for (const alias of aliases.sort((a, b) => b.length - a.length)) {
    if (rest.startsWith(alias + ' ') || rest === alias) {
        matched = 'found';
        value = rest.startsWith(alias + ' ') ? rest.slice(alias.length).trim() : null;
        break;
    }
    if (rest.includes(' ' + alias + ' ')) {
        const idx = rest.indexOf(' ' + alias + ' ');
        matched = 'found';
        console.log("slice0:" + rest.slice(0, idx), "slice1:" + rest.slice(idx + alias.length + 1));
        value = (rest.slice(0, idx) + ' ' + rest.slice(idx + alias.length + 1)).trim();
        break;
    }
}
console.log(matched, value);
