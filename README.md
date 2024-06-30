## Prerequisites

**Node.js:** Ensure you have Node.js v20.11.1 installed

**pnpm:** This project uses pnpm for package management. Install pnpm if you don't have it already:

```
npm install -g pnpm
```

## Setup

1. Clone the repository:

```sh
https://github.com/epochclan/savie-server.git
cd savie-server
```

2. Set the Node.js version:
   If you're using nvm (Node Version Manager), you can set the Node.js version by running:

```sh
nvm use 20.11.1
```

This will use the version specified in the .nvmrc file.

3. Install dependencies:
   Use pnpm to install the project dependencies:

```sh
pnpm install
```

4. Environment variables:
   Create a .env file in the root directory of your project and add the necessary environment variables. You can use the .env.example file as a reference:

```sh
cp .env.example .env
```

Edit the .env file and add the required values.

## Running the Project

To start the project, use the following command:

```sh
pnpm start
```

This will run the application as specified in the scripts section of the package.json file.
