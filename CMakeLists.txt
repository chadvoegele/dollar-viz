cmake_minimum_required(VERSION 2.6)

set(PROJECT_NAME "budget-charts")
project("${PROJECT_NAME}")
set(budget_charts_VERSION_MAJOR 0)
set(budget_charts_VERSION_MINOR 1)

set(SRC_DIR "${PROJECT_SOURCE_DIR}/src")
set(TEST_DIR "${PROJECT_SOURCE_DIR}/test")
set(RES_DIR "${PROJECT_SOURCE_DIR}/res")
set(WWW_DIR "${PROJECT_SOURCE_DIR}/www")

include(cmake/set_cpp11.cmake)

add_subdirectory(${SRC_DIR})
add_subdirectory(${TEST_DIR})
add_subdirectory(${WWW_DIR})
