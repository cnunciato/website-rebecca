FROM ubuntu:latest

# Install various tools.
RUN apt-get update && \
	apt-get upgrade -y && \
	apt-get install -y \
	ffmpeg \
	curl \
	wget \
	exiftran \
	unzip \
	make \
	python

# Install Node and NPM.
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN apt-get install -y nodejs

# Install the AWS CLI.
RUN python -V
RUN wget https://s3.amazonaws.com/aws-cli/awscli-bundle.zip
RUN unzip awscli-bundle.zip
RUN ./awscli-bundle/install -i /usr/local/aws -b /usr/local/bin/aws

# Create the app directory.
WORKDIR /usr/src/app

# Copy the app into the container.
COPY *.json *.ts ./

# Install it.
RUN npm install

# And go!
EXPOSE 8080
CMD [ "npm", "start" ]
