export function uppercaseLetterToNumber(str: string) {
    const map = {
        ABC: '2',
        DEF: '3',
        GHI: '4',
        JKL: '5',
        MNO: '6',
        PQRS: '7',
        TUV: '8',
        WXYZ: '9',
    }

    return str.replace(/[A-Z]/g, (match) => {
        const idx = Object.keys(map).findIndex(k => k.includes(match))
        return Object.values(map)[idx]
    })
}
