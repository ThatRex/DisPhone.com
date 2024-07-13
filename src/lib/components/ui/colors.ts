export type ColorsBtn = keyof typeof ColorsBtn
export const ColorsBtn = {
	mono: 'border-neutral-500 bg-neutral-500 dark:border-neutral-300 dark:bg-neutral-300',
	red: 'border-red-500 bg-red-500',
	orange: 'border-orange-500 bg-orange-500',
	yellow: 'border-yellow-500 bg-yellow-500',
	green: 'border-green-500 bg-green-500',
	blue: 'border-blue-500 bg-blue-500',
	purple: 'border-purple-500 bg-purple-500'
} as const
