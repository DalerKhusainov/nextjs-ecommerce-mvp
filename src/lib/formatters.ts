// This code creates a formatter for formatting currencies and formatting numbers
// It adds in different commas, dollar sign and so on insided of our code. 

const CURRENCY_FORMATTER = new Intl.NumberFormat("en-US", {
    currency: 'USD',
    style: "currency",
    minimumFractionDigits: 0,
})

export function formatCurrency(amount: number) {
    return CURRENCY_FORMATTER.format(amount)
}

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US")

export function formatNumber(number: number) {
    return NUMBER_FORMATTER.format(number)
}
