#!/usr/bin/env node

"use strict"

const Clubhouse = require("clubhouse-lib")
const { ArgumentParser } = require("argparse")
const { Octokit } = require("@octokit/rest")
const ghIssueRe = /#(\d+)/gi

let parser = new ArgumentParser({
  version: "1.0.0",
  addHelp: true,
  description: "Tilt exterminator tool",
})

parser.addArgument("--dry-run", {
  help: "Print out what data will change rather than changing anything",
  action: "storeTrue",
})

let subparsers = parser.addSubparsers()
let syncParser = subparsers.addParser("sync", {
  addHelp: true,
  help: "sync an issue from github to clubhouse",
})

syncParser.addArgument(["-i", "--issue"], {
  help: "The github issue to import into clubhouse",
  required: true,
  type: String,
})

let args = parser.parseArgs()
let isDryRun = args.dry_run
if (isDryRun) {
  console.warn("⚠️ Running in dry run mode ⚠️")
}
const issueURL = args.issue
const ghRegex = /github.com\/([^\/]+)\/([^\/]+)\/[^\/]+\/(\d+)/i;
const matches = issueURL.match(ghRegex);
let owner, repo, issueNumber;
if (!matches) {
  console.error(`error: --issue must be a valid URL to a github issue, e.g.: https://github.com/tilt-dev/tilt/issues/1`)
  process.exit(1)
}
owner = matches[1];
repo = matches[2];
issueNumber = matches[3];

const clubhouseToken = process.env.CLUBHOUSE_API_TOKEN
if (!clubhouseToken) {
  console.error("Please set the CLUBHOUSE_API_TOKEN env variable")
  process.exit(1)
}

const githubToken = process.env.GITHUB_API_TOKEN
const octokitOptions = {}
if (githubToken) {
  octokitOptions.auth = githubToken
} else {
  console.warn(
    "Warning: no GITHUB_API_TOKEN found in your env. Consider setting one to keep you from getting rate-limited."
  )
}

const TILT_PROJECT_ID = 6
const octokit = new Octokit(octokitOptions)
const ch = Clubhouse.create(clubhouseToken)

// Given the body of the github issue, replace #xxxx references to a Github
// issue/PR with a hyperlink to the issue/PR (otherwise Clubhouse renders
// it as a link to a Clubhouse issue).
function cleanBody(body) {
  // NOTE: if #xxxx is a pull request, "...issues/xxxx"
  // will redirect to "...pulls/xxx"
  return body.replace(
    ghIssueRe,
    `[#$1](https://github.com/${owner}/${repo}/issues/$1)`
  )
}

// Given the github issue, see if there's already a clubhouse story for it.
//
// Returns a promise that evaluates to a story object, or null if none found.
function findClubhouseStoryForGithubIssue(issue) {
  let url = issue.html_url
  return ch.getResource('external-link/stories', {'external_link': url}).then(response => {
    return response.find(story => {
      let links = story.external_links || []
      return links.some(link => link == issue.html_url)
    })
  })
}

// Create a new clubhouse story.
function createClubhouseStoryForGithubIssue(issue) {
  let title = issue.title
  let body = cleanBody(issue.body)
  let url = issue.html_url
  let id = issue.id
  let storyType = 'feature'
  let labels = issue.labels || []
  let isBug = labels.some((label) => label.name == 'bug')
  if (isBug) {
    storyType = 'bug'
  }

  let story = {
    name: title,
    story_type: storyType,
    description: body,
    project_id: TILT_PROJECT_ID,
    labels: [{ name: "exterminator" }],
    external_links: [ url ],
  }

  if (isDryRun) {
    return new Promise((resolve, _) => resolve(story))
  }

  return ch.createStory(story)
}




octokit.issues
  .get({
    owner: owner,
    repo: repo,
    issue_number: issueNumber,
  })
  .then(response => {
    let issue = response.data
    let storyPromise = findClubhouseStoryForGithubIssue(issue)
    return Promise.all([issue, storyPromise])
  })
  .then(([issue, existingStory]) => {
    if (existingStory) {
      console.log("Found existing clubhouse issue:\n" + existingStory.app_url)
    } else {
      return createClubhouseStoryForGithubIssue(issue).then(response => {
        if (isDryRun) {
          console.log("Running in dry run mode, so not writing to clubhouse")
          console.log("Clubhouse story that would have been created:\n")
          console.log(response)
        } else {
          console.log("Created new clubhouse issue:\n" + response.app_url)
        }
      })
    }
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
