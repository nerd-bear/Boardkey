export type KeyDef = { label: string; code: string; w?: number };

export const keyboardLayout: KeyDef[][] = [
	[
		{ label: '`', code: '`' },
		{ label: '1', code: '1' },
		{ label: '2', code: '2' },
		{ label: '3', code: '3' },
		{ label: '4', code: '4' },
		{ label: '5', code: '5' },
		{ label: '6', code: '6' },
		{ label: '7', code: '7' },
		{ label: '8', code: '8' },
		{ label: '9', code: '9' },
		{ label: '0', code: '0' },
		{ label: '-', code: '-' },
		{ label: '=', code: '=' },
		{ label: 'Backspace', code: 'Backspace', w: 2 }
	],
	[
		{ label: 'Tab', code: 'Tab', w: 1.5 },
		...'QWERTYUIOP'.split('').map((k) => ({ label: k, code: k })),
		{ label: '[', code: '[' },
		{ label: ']', code: ']' },
		{ label: '\\', code: '\\' }
	],
	[
		{ label: 'Caps', code: 'CapsLock', w: 1.75 },
		...'ASDFGHJKL'.split('').map((k) => ({ label: k, code: k })),
		{ label: ';', code: ';' },
		{ label: "'", code: "'" },
		{ label: 'Enter', code: 'Enter', w: 2.25 }
	],
	[
		{ label: 'Shift', code: 'Shift', w: 2.25 },
		...'ZXCVBNM'.split('').map((k) => ({ label: k, code: k })),
		{ label: ',', code: ',' },
		{ label: '.', code: '.' },
		{ label: '/', code: '/' },
		{ label: 'Shift', code: 'Shift', w: 2.75 }
	],
	[
		{ label: 'Ctrl', code: 'Control', w: 1.5 },
		{ label: 'Alt', code: 'Alt', w: 1.5 },
		{ label: 'Space', code: ' ', w: 6 },
		{ label: 'Alt', code: 'Alt', w: 1.5 },
		{ label: 'Ctrl', code: 'Control', w: 1.5 }
	]
];