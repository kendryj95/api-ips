const currencies = require('./currencies')

function currencyFormatter (amount, currency) {
	let formatted = "NaN"

	for (var i = currencies.length - 1; i >= 0; i--) {
		let current = currencies[i]

		if (current.code === currency.toUpperCase()) {
			formatted = formatMoney(amount, 2, current.symbol, current.thousandsSeparator, current.decimalSeparator)
		}
	}

	return formatted
}

function formatMoney (number, places, symbol, thousand, decimal) {
	number = number || 0;
	places = !isNaN(places = Math.abs(places)) ? places : 2;
	symbol = symbol !== undefined ? symbol : "$";
	thousand = thousand || ",";
	decimal = decimal || ".";
	var negative = number < 0 ? "-" : "",
			i = parseInt(number = Math.abs(+number || 0).toFixed(places), 10) + "",
			j = (j = i.length) > 3 ? j % 3 : 0;
	return symbol + negative + (j ? i.substr(0, j) + thousand : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousand) + (places ? decimal + Math.abs(number - i).toFixed(places).slice(2) : "");
}

module.exports = {
	money: currencyFormatter
}