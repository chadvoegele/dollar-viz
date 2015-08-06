function(set_cpp11 NAME)
  if (${CMAKE_VERSION} VERSION_GREATER "3.2")
    set_property(TARGET ${NAME} PROPERTY CXX_STANDARD 11)
    set_property(TARGET ${NAME} PROPERTY CXX_STANDARD_REQUIRED ON)
  else (${CMAKE_VERSION} VERSION_GREATER "3.2")
    set_target_properties(${NAME} PROPERTIES COMPILE_FLAGS "-std=c++11")
  endif (${CMAKE_VERSION} VERSION_GREATER "3.2")
endfunction(set_cpp11)
