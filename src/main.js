import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as github from '@actions/github'

/**
 * The main function for the action.
 *
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run() {
  try {
    // Get inputs
    const project = core.getInput('project', { required: true })
    const benchmarkCommand = core.getInput('benchmark-command', {
      required: true
    })
    const token = core.getInput('token', { required: true })
    const repoOwner = core.getInput('repo-owner') || github.context.repo.owner
    const repoName = core.getInput('repo-name') || github.context.repo.repo
    const machineName = core.getInput('machine-name') || 'github-actions'
    const endpoint = core.getInput('endpoint') || 'https://api.benchboard.com'
    const repoPath = core.getInput('repo-path') || '.'
    const prNumber =
      core.getInput('pr-number') ||
      (github.context.payload.pull_request
        ? github.context.payload.pull_request.number
        : '')
    const githubRunId = core.getInput('github-run-id') || github.context.runId

    core.info('Installing benchboard-cli from GitHub repository...')

    // Install benchboard-cli directly from GitHub
    await exec.exec('npm', [
      'install',
      '-g',
      'https://github.com/arashbm/benchboard-client.git'
    ])

    core.info('Running benchmark command...')

    // Run the benchmark command and capture output
    let benchmarkOutput = ''
    const benchmarkOptions = {
      listeners: {
        stdout: (data) => {
          benchmarkOutput += data.toString()
        }
      }
    }

    await exec.exec(benchmarkCommand, [], benchmarkOptions)

    core.info('Running benchboard-cli...')

    // Prepare benchboard-cli arguments
    const benchboardArgs = [
      '--project',
      project,
      '--repo-owner',
      repoOwner,
      '--repo-name',
      repoName,
      '--machine-name',
      machineName,
      '--repo-path',
      repoPath,
      '--endpoint',
      endpoint,
      '--token',
      token
    ]

    // Add optional PR number if available
    if (prNumber) {
      benchboardArgs.push('--pr', prNumber.toString())
    }

    // Add GitHub run ID
    if (githubRunId) {
      benchboardArgs.push('--github-run-id', githubRunId.toString())
    }

    // Run benchboard-cli with the benchmark output piped as input
    let benchboardOutput = ''
    const benchboardOptions = {
      input: Buffer.from(benchmarkOutput),
      listeners: {
        stdout: (data) => {
          benchboardOutput += data.toString()
        }
      }
    }

    await exec.exec('benchboard-cli', benchboardArgs, benchboardOptions)

    core.info('Successfully sent benchmark results to Benchboard!')
    core.setOutput('benchboard-output', benchboardOutput)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
