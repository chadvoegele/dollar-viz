cmake_minimum_required(VERSION 2.6)

set(PROJECT_NAME "budget-charts")
project("${PROJECT_NAME}")
set(budget_charts_VERSION_MAJOR 0)
set(budget_charts_VERSION_MINOR 1)

set(WWW_DIR "${PROJECT_SOURCE_DIR}/www")

add_subdirectory(${WWW_DIR})
