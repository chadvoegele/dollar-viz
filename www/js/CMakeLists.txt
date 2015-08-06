find_program(CLOSURE_BIN NAMES closure closure-compiler)

set(JS_SRC cache.js chart.js ChartRequest.js data.js
  LedgerRequest.js plot.js)
set(JS_SRC_MIN chart_min.js)

add_custom_target(JS ALL ${CLOSURE_BIN} --js ${JS_SRC} --js_output_file
  ${JS_SRC_MIN})

set(EXTERNAL_JS_SRC bootstrap-datepicker.min.js)

install(FILES ${JS_SRC_MIN} ${EXTERNAL_JS_SRC} DESTINATION www/js)
