//
// Copyright (c) 2015 Chad Voegele
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without modification,
// are permitted provided that the following conditions are met:
//
//  * Redistributions of source code must retain the above copyright notice, this
// list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright notice,
// this list of conditions and the following disclaimer in the documentation and/or
// other materials provided with the distribution.
//  * The name of Chad Voegele may not be used to endorse or promote products
// derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
// ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//

#include <gtest/gtest.h>

#include "uri_parser.h"

void run_split_test(const std::string& input, const std::list<std::string>& expected) {
  auto split = budget_charts::split_string(input, std::string("/"));
  ASSERT_TRUE(split == expected);
}

void run_join_test(const std::list<std::string>& input, const std::string& expected) {
  auto joined = budget_charts::join_string(input, std::string("/"));
  ASSERT_TRUE(joined == expected);
}

TEST(uri_parser, split_string1) {
  std::string joined("a/b/c");
  std::list<std::string> parts = {"a", "b", "c"};
  run_split_test(joined, parts);
  run_join_test(parts, joined);
}

TEST(uri_parser, split_string2) {
  std::string joined("/a/b/c/");
  std::list<std::string> parts = {"", "a", "b", "c", ""};
  run_split_test(joined, parts);
  run_join_test(parts, joined);
}

TEST(uri_parser, split_string3) {
  std::string joined("");
  std::list<std::string> parts = {""};
  run_split_test(joined, parts);
  run_join_test(parts, joined);
}

void run_mapify_uri_test(std::multimap<std::string, std::string> input,
    std::unordered_map<std::string, std::list<std::string>> expected) {
  std::unordered_map<std::string, std::list<std::string>> actual
    = budget_charts::mapify_uri_args(input);
  ASSERT_TRUE(actual == expected);
}

TEST(uri_parser, mapify_uri1) {
  std::multimap<std::string, std::string> input
    = { {"arg1", "cat"}, {"arg1", "dog"}, {"arg2", "kiwi"} };
  std::unordered_map<std::string, std::list<std::string>> expected_args
    = { {"arg1", {"cat", "dog"}}, {"arg2", {"kiwi"}} };
  run_mapify_uri_test(input, expected_args);
}
