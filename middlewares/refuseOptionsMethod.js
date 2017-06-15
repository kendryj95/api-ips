module.exports = (req, res, next) => {
	if (req.method == 'OPTIONS') {
		res.status(200).end()
	} else {
		next()
	}
}