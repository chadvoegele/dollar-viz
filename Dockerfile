FROM ubuntu:xenial
RUN \
      apt-get update && \
      apt-get install -y npm ant curl openjdk-8-jdk
RUN \
    curl -o /tmp/closure-compiler.tar.gz https://codeload.github.com/google/closure-compiler/tar.gz/v20160713 && \
    mkdir -p /tmp/closure-compiler-extract && \
    tar -xf /tmp/closure-compiler.tar.gz -C /tmp/closure-compiler-extract && \
    cd /tmp/closure-compiler-extract/closure-compiler-20160713 && \
    ant jar && \
    install -m755 -D build/compiler.jar /usr/share/java/closure-compiler/closure-compiler.jar
COPY Gruntfile.js LICENSE package.json /usr/share/dollar-viz/
COPY www /usr/share/dollar-viz/www
WORKDIR /usr/share/dollar-viz
RUN \
      npm install && \
      /usr/bin/nodejs node_modules/grunt/bin/grunt build
RUN \
      rm -r /tmp/closure-compiler-extract /tmp/closure-compiler.tar.gz
