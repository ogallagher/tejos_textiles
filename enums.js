/*
enums.js
Owen Gallagher
26 july 2019
*/

exports.site = {
	TEXTILES: 0,
	TEJOS: 1
}

exports.time = {
	SECOND: 1000,
	MINUTE: 1000 * 60,
	HOUR:   1000 * 60 * 60,
	DAY:    1000 * 60 * 60 * 24,
	WEEK:   1000 * 60 * 60 * 24 * 7,
	MONTH:  1000 * 60 * 60 * 24 * 30,
	YEAR:   1000 * 60 * 60 * 24 * 365
}

exports.log_type = {
	DEBUG: 0,
	INFO: 1,
	WARNING: 2,
	ERROR: 3
}

exports.var_max = {
	FOUR_BYTE_U:	4294967295,
	FOUR_BYTE:		2147483647
}