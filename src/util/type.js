
// get type string of a construtor function
export function getType(fn) {
    if (fn === undefined) {
        return undefined
    }
    const match = fn && fn.toString().match(/^\s*function (\w+)/)
    return match ? match[1] : ''
}

// get type string of a variable
export function getTypeOf(value) {
    let fn = value === undefined ? undefined : Object.getPrototypeOf(value).constructor
    return getType(fn)
}

// check if a variable's type is the type provided
export function isType(type, value) {
    return getTypeOf(value) === getType(type)
}