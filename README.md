## GraphQL Project for 01F

Please login with your credentials


GraphQL Profile Page Project

Objectives

The goal of this project is to learn and apply the GraphQL query language by creating a personal profile page. The profile page will display user data retrieved from the provided GraphQL endpoint:

GraphQL API Endpoint: https://learn.01founders.co/api/graphql-engine/v1/graphql

To access user data, authentication via a login page will be required.

Features

User authentication using JWT (JSON Web Token)

Display three or more selected user data attributes, such as:

Basic user identification (username, email, etc.)

XP amount

Grades

Audits

Skills

A mandatory section for statistical graph generation using SVG

Two or more different statistic graphs, such as:

XP earned over time

XP earned per project

Audit success ratio

Project pass/fail statistics

Attempts per exercise

Any other insightful statistics related to user performance

A fully hosted profile page (GitHub Pages, Netlify, or any other hosting platform)

Authentication and Login

Authentication is required to access the GraphQL API.

Users must log in using either:

username:password

email:password

The login page must support JWT authentication:

Obtain a JWT from the signin endpoint: https://learn.01founders.co/api/auth/signin

Use Basic Authentication with base64 encoding to retrieve the JWT.

Store and supply the JWT using Bearer authentication for subsequent requests.

Provide a logout mechanism to invalidate the session.

GraphQL Querying

The profile page will query user data from the GraphQL API.

Queries must utilize:

Basic queries

Nested queries

Queries with arguments

Example Queries

Retrieve user ID and login details:

{
  user {
    id
    login
  }
}

Retrieve object details by ID:

{
  object(where: { id: { _eq: 3323 }}) {
    name
    type
  }
}

Retrieve results with associated user information:

{
  result {
    id
    user {
      id
      login
    }
  }
}

Hosting

The profile page must be hosted online. Recommended hosting options include:

GitHub Pages

Netlify

Vercel

Database Structure

Some relevant tables available via the GraphQL API include:

user: Contains user information (id, login).

transaction: Stores XP transactions (id, type, amount, userId).

progress: Tracks user progress on projects (id, userId, objectId, grade).

result: Stores student progression results.

object: Provides information on exercises and projects.

Learning Outcomes

This project provides hands-on experience with:

GraphQL querying and data retrieval

Authentication and JWT-based authorization

Hosting web applications

UI/UX principles for data visualization

SVG-based graph generation

Technologies Used

GraphQL for data querying

GraphiQL for schema exploration

JWT for authentication

HTML, CSS, JavaScript for front-end development

SVG for graph generation

Hosting services (GitHub Pages, Netlify, etc.)

Getting Started

Clone this repository:

git clone <repository_url>

Navigate to the project directory:

cd graphql-profile-page

Install dependencies (if applicable):

npm install

Start the development server:

npm start

Access the profile page in your browser and log in to retrieve data.

Deploy the project to a hosting service of your choice.