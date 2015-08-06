cmake_minimum_required(VERSION 2.6)

set(PROJECT_TEST_NAME "${PROJECT_NAME}_tests")

include(../cmake/find_boost.cmake)
include(../cmake/find_microhttpd.cmake)

find_library(CURL_LIB NAMES "libcurl.so" PATHS "/usr/lib")
find_path(CURL_INCLUDE NAMES "curl/curl.h")

find_library(GTEST_LIB NAMES "libgtest.so" "libgtest.a" PATHS "/usr/lib")
find_path(GTEST_INCLUDE NAMES "gtest/gtest.h")

find_package(Threads)

configure_file(definitions.cpp.in definitions.cpp)

include_directories(${SRC_DIR} ${TEST_DIR} ${GTEST_INCLUDE} ${CURL_INCLUDE})
add_executable(${PROJECT_TEST_NAME} test.cpp ledger_rest_tests.cpp
  uri_parser_tests.cpp mhd_tests.cpp file_reader_tests.cpp definitions.cpp
  black_hole_logger.cpp)
target_link_libraries(${PROJECT_TEST_NAME} ${PROJECT_NAME}
  ${GTEST_LIB} ${Boost_LIBRARIES} ${MICROHTTPD_LIB} ${CURL_LIB}
  ${CMAKE_THREAD_LIBS_INIT})
set_cpp11(${PROJECT_TEST_NAME})
