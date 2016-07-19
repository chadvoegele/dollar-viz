FROM ubuntu:xenial
RUN \
      apt-get update && \
      apt-get install -y npm closure-compiler
COPY Gruntfile.js LICENSE package.json /usr/share/budget-charts/
COPY www /usr/share/budget-charts/www
WORKDIR /usr/share/budget-charts
RUN \
      npm install && \
      mkdir /usr/share/java/closure-compiler && \
      ln -s /usr/share/java/closure-compiler-v20130227.jar /usr/share/java/closure-compiler/closure-compiler.jar && \
      /usr/bin/nodejs node_modules/grunt/bin/grunt build
