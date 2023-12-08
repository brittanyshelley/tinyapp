const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const bcrypt = require('bcryptjs');


const { generateRandomString, getUserByEmail, checkIfAlreadyRegistered, urlsForUser } = require("./helpers");

app.set("view engine", "ejs");

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
};

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
  "aJ48lW": {
    id: "aJ48lW",
    email: "test@test.com",
    password: "$2a$10$4Va.wonTRBXjdkxc7XdD6eZbZVV.Migsdg8PEhuiU1xQZ5Ia7DdWO",
  }
};


//Middleware
app.use((req, res, next) => {
  console.log(`ROUTE: ${req.method} ${req.url}`);
  next();
});

app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ['cookieKey'],
}));

// Home
app.get("/", (req, res) => {
  const userID = req.session.user_id;
  const loggedInUser = users[userID];//Get the user_id from the session
  if (loggedInUser) {
    return res.redirect('/urls');
  }
  if (!loggedInUser) {
    return res.redirect('/login');
  }
});

// GET /urls route
app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  const loggedInUser = users[userId];
  if (!loggedInUser) {
    return res.send('<h2>You must be signed in to use this page</h2>');
  }

  if (loggedInUser) {
    const userUrls = urlsForUser(userId, urlDatabase);
    const templateVars = {
      urls: userUrls,
      user: loggedInUser
    };
    return res.render("urls_index", templateVars);
  }
});

// GET /urls/new route
app.get("/urls/new", (req, res) => {
  const userID = req.session.user_id;
  const loggedInUser = users[userID];

  if (!loggedInUser) {
    return res.redirect('/login');
  }

  //Passing user object to templateVars
  const templateVars = {
    urls: urlDatabase,
    user: users[loggedInUser]
  };

  res.render("urls_new", templateVars);
});

// GET /urls/:id route (DONE)
app.get("/urls/:id", (req, res) => {
  const userID = req.session.user_id;
  const loggedInUser = users[userID];
  // Check if the user is logged in
  if (!loggedInUser) {
    return res.send('<h2>You must be signed in to use this page</h2></br></br><a href="/login">Login to continue</a>');
  }

  // Check if the URL belongs to the logged-in user
  const shortUrl = req.params.id;
  const userURLs = urlsForUser(userID, urlDatabase);

  // Check if the shortUrl exists in the user's URLs
  if (userURLs[shortUrl] && userURLs[shortUrl].userID === userID) {
    // If the URL belongs to the user, render the page
    const templateVars = {
      id: shortUrl,
      longURL: userURLs[shortUrl].longURL,
      user: loggedInUser
    };
    return res.render("urls_show", templateVars);
  }
  // Check if the URL does not exist for the user
  if (!userURLs[shortUrl]) {
    res.status(404).send('<h2>URL not found</h2>');
    return;
  }

  // If the URL exists but does not belong to the user, display an error message
  res.send('<h2>You do not have permission to edit this URL</h2>');
});

// GET /u/:id route (DONE)
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  if (urlDatabase[shortURL]) {
    const longURL = urlDatabase[shortURL]["longURL"];
    res.redirect(longURL);
  }
  res.status(404).send("<h2>URL not found</h2>");
});

// Complete the POST /urls route (DONE)
app.post("/urls", (req, res) => {
  const userID = req.session.user_id;
  const loggedInUser = users[userID];
  if (!loggedInUser) {
    return res.status(401).send('You must be signed in to use this page');
  }
  const longURL = req.body.longURL;
  const id = generateRandomString();
  urlDatabase[id] = {
    longURL,
    userID
  };
  res.redirect(`/urls/${id}`);
});

//Update's url from database when button pushed
app.post('/urls/:id', (req, res) => {
  const userID = req.session.user_id;
  const loggedInUser = users[userID];
  // Check if the user is logged in
  if (!loggedInUser) {
    return res.send('<h2>You must be signed in to use this page</h2></br></br><a href="/login">Login to continue</a>');
  }
  // Check if the URL belongs to the logged-in user
  const shortUrl = req.params.id;
  const longURL = req.body.newLongURL;
  const userURLs = urlsForUser(userID, urlDatabase);

  // Check if the shortUrl exists in the user's URLs
  if (userURLs[shortUrl] && userURLs[shortUrl].userID === userID) {
    // If the URL belongs to the user, render the page

    // Update the longURL for the specified URL
    urlDatabase[shortUrl].longURL = longURL;
    return res.redirect('/urls');
  }
  return res.send('<h3>URL not found</h3></br></br><a href="/urls/new">Create new url</a>');
});

// Delete's url from database when button pushed
app.post("/urls/:id/delete", (req, res) => {
  const userID = req.session.user_id;
  const loggedInUser = users[userID];
  if (!loggedInUser) {
    return res.send('<h2>You must be signed in to use this page</h2>');
  }

  const id = req.params.id;
  const shortUrl = urlDatabase[id];
  // is this url owned by the logged in user?
  if (shortUrl.userID !== userID) {
    return res.send('<h2>You do not have permission to edit this URL</h2>');
  }

  delete urlDatabase[id];
  res.redirect("/urls");
});

// GET login
app.get("/login", (req, res) => {
  const userID = req.session.user_id;
  const loggedInUser = users[userID];//Get the user_id from the session
  if (loggedInUser) {
    return res.redirect('/urls');
  }
  const templateVars = { user: null };
  res.render("urls_login", templateVars);
});

//  Complete the POST /login route
//POST /login
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  // did they NOT give us an email or password
  if (!email || !password) {
    return res.status(403).send('please provide an email AND password');
  }

  // lookup the user based on their email
  const foundUser = getUserByEmail(email, users);
  // did we NOT find a user
  if (!foundUser) {
    return res.status(403).send('no user with that email found');
  }

  // do the passwords NOT match
  const result = bcrypt.compareSync(password, foundUser.password);
  if (!result) {
    return res.status(403).send('passwords do not match');
  }
  req.session.user_id = foundUser.id;
  res.redirect('/urls');
});

// Complete the GET /register route
app.get('/register', (req, res) => {
  //Get the user_id from the session
  const userID = req.session.user_id;
  const loggedInUser = users[userID];

  if (loggedInUser) {
    return res.redirect('/urls');
  }

  const templateVars = { user: null };
  res.render('urls_register', templateVars);
});

// Handle the registration logic here
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  // did they NOT give us an email or password
  if (!email || !password) {
    return res.status(400).send('please provide an email AND password');
  }
  // check if the provided email address is unique
  const foundUser = checkIfAlreadyRegistered(email, users);
  // did we find a user
  if (foundUser) {
    return res.status(400).send('a user with that email already exists');
  }
  const id = generateRandomString();
  // generate the hash
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  console.log('hash:', hash);
  const user = {
    id,
    email,
    password: hash,
  };
  users[id] = user; // Update the users object with the new user
  req.session.user_id = id; // Setting the cookie here
  res.redirect('/urls');
});

//Logout, clear username cookie and redirect to /urls
app.post('/logout', (req, res) => {
  req.session.user_id = null; // clear all cookies
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
