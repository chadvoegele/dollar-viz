# Copyright (c) 2015 Chad Voegele
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without modification,
# are permitted provided that the following conditions are met:
#
#  * Redistributions of source code must retain the above copyright notice, this
# list of conditions and the following disclaimer.
#  * Redistributions in binary form must reproduce the above copyright notice,
# this list of conditions and the following disclaimer in the documentation and/or
# other materials provided with the distribution.
#  * The name of Chad Voegele may not be used to endorse or promote products
# derived from this software without specific prior written permission.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
# ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
# WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
# DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
# ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
# (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
# LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
# ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
# SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

#/bin/sh
read -p "Generating server key?" -n 1 -r
echo
NAME_SERVER="server"
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "Generating key"
  openssl genrsa -des3 -out ${NAME_SERVER}.key 4096
  echo "Generating request"
  openssl req -new -key ${NAME_SERVER}.key -out ${NAME_SERVER}.csr
  echo "Creating cert"
  openssl x509 -req -days 365 -in ${NAME_SERVER}.csr -signkey ${NAME_SERVER}.key -out ${NAME_SERVER}.crt
fi

NAME="client"
read -p "Generate and sign client key?" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "Generating key"
  openssl genrsa -des3 -out ${NAME}.key 4096
  echo "Generating request"
  openssl req -new -key ${NAME}.key -out ${NAME}.csr
  echo "Signing cert"
  openssl x509 -req -days 365 -in ${NAME}.csr -CA ${NAME_SERVER}.crt -CAkey ${NAME_SERVER}.key -set_serial 01 -out ${NAME}.crt
  echo "Converting to pkcs12"
  openssl pkcs12 -export -clcerts -in ${NAME}.crt -inkey ${NAME}.key -out ${NAME}.p12
fi
