module.exports = {
    "ignorePatterns": [
      "www/js/vendor/bootstrap-datepicker.min.js",
      "www/js/vendor/arg-1.3.min.js"
    ],
    "env": {
        "browser": true,
        "es2021": true,
    },
    "extends": [
        "standard"
    ],
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "globals": {
      "d3": "readonly",
      "$": "readonly",
      "Bloodhound": "readonly",
      "Arg": "readonly",
    },
    "rules": {
      "camelcase": "off"
    }
};
