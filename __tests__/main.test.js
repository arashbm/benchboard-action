/**
 * Unit tests for the action's main functionality, src/main.js
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock @actions/exec
const mockExec = jest.fn()
const mockExecModule = { exec: mockExec }

// Mock @actions/github
const mockGithub = {
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    runId: 12345,
    payload: {}
  }
}

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/exec', () => mockExecModule)
jest.unstable_mockModule('@actions/github', () => mockGithub)

// The module being tested should be imported dynamically.
const { run } = await import('../src/main.js')

describe('main.js', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks()

    // Set default input values
    core.getInput.mockImplementation((name) => {
      const inputs = {
        project: 'test-project',
        'benchmark-command': 'npm run benchmark',
        token: 'test-token',
        'repo-owner': '',
        'repo-name': '',
        'machine-name': '',
        endpoint: '',
        'repo-path': '',
        'pr-number': '',
        'github-run-id': ''
      }
      return inputs[name] || ''
    })

    // Mock successful exec calls
    mockExec.mockResolvedValue(0)
  })

  it('installs benchboard-cli and runs it with benchmark command', async () => {
    await run()

    // Verify benchboard-cli was installed
    expect(mockExec).toHaveBeenCalledWith('npm', [
      'install',
      '-g',
      'https://github.com/arashbm/benchboard-client.git'
    ])

    // Verify benchboard-cli was called with correct arguments
    expect(mockExec).toHaveBeenCalledWith(
      'benchboard-cli',
      [
        '--project',
        'test-project',
        '--repo-owner',
        'test-owner',
        '--repo-name',
        'test-repo',
        '--machine-name',
        'github-actions',
        '--repo-path',
        '.',
        '--endpoint',
        'https://api.benchboard.com',
        '--token',
        'test-token',
        '--github-run-id',
        '12345',
        '--',
        'npm',
        'run',
        'benchmark'
      ],
      expect.any(Object)
    )

    // Verify success message
    expect(core.info).toHaveBeenCalledWith(
      'Successfully sent benchmark results to Benchboard!'
    )
  })

  it('includes PR number when available', async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = {
        project: 'test-project',
        'benchmark-command': 'npm run benchmark',
        token: 'test-token',
        'pr-number': '123'
      }
      return inputs[name] || ''
    })

    await run()

    expect(mockExec).toHaveBeenCalledWith(
      'benchboard-cli',
      expect.arrayContaining(['--pr', '123']),
      expect.any(Object)
    )
  })

  it('handles exec errors and sets failed status', async () => {
    const error = new Error('Installation failed')
    mockExec.mockRejectedValueOnce(error)

    await run()

    expect(core.setFailed).toHaveBeenCalledWith('Installation failed')
  })

  it('uses custom inputs when provided', async () => {
    core.getInput.mockImplementation((name) => {
      const inputs = {
        project: 'custom-project',
        'benchmark-command': 'python benchmark.py',
        token: 'custom-token',
        'repo-owner': 'custom-owner',
        'repo-name': 'custom-repo',
        'machine-name': 'custom-machine',
        endpoint: 'https://custom.api.com',
        'repo-path': '/custom/path'
      }
      return inputs[name] || ''
    })

    await run()

    expect(mockExec).toHaveBeenCalledWith(
      'benchboard-cli',
      [
        '--project',
        'custom-project',
        '--repo-owner',
        'custom-owner',
        '--repo-name',
        'custom-repo',
        '--machine-name',
        'custom-machine',
        '--repo-path',
        '/custom/path',
        '--endpoint',
        'https://custom.api.com',
        '--token',
        'custom-token',
        '--github-run-id',
        '12345',
        '--',
        'python',
        'benchmark.py'
      ],
      expect.any(Object)
    )
  })
})
