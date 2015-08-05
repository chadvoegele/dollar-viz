set(JS_DIR "${WWW_DIR}/js")

add_subdirectory(${JS_DIR})

set(CSS_FILES css/bootstrap-datepicker3.standalone.min.css
              css/chart.css)
set(LEDGER_FILES ledger/chart.html)
set(WWW_FILES 404.html)

install(FILES ${WWW_FILES} DESTINATION www)
install(FILES ${CSS_FILES} DESTINATION www/css)
install(FILES ${LEDGER_FILES} DESTINATION www/ledger)
