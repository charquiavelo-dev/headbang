const enabled = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (n:number) => (s:string) => enabled ? `\x1b[${n}m${s}\x1b[0m` : s;
export const c = { bold:wrap(1), dim:wrap(2), red:wrap(31), green:wrap(32), yellow:wrap(33), blue:wrap(34), magenta:wrap(35), cyan:wrap(36), gray:wrap(90) };
export const icons = { ok:'✓', fail:'✗', warn:'!', dot:'•', arrow:'→', rock:'🤘' };
