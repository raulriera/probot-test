module.exports = ({github, context}) => {
  const labels = context.payload.issue.labels.map(item => item.name.toLowerCase()).join()

  const isBug = labels.includes("bug")
  const isDomainIncluded = new RegExp('domain:*', 'g');
  const isPriorityIncluded = new RegExp('p[0-3]', 'g');
  const isTriaged = isDomainIncluded.test(labels) && isPriorityIncluded.test(labels)
  
  const botMessage = `
  **⚠️ Missing information**

  Issues can’t be created without appropiate triaging. In order to continue, please:

  1. Read our [CONTRIBUTING guidelines](https://github.com/Shopify/pos-next-react-native/blob/master/CONTRIBUTING.md).
  2. Comment to this issue with \`/triaged\` once you have updated the issue.
  `

  if (context.eventName === 'issues' && context.payload.action === 'opened') {
    if (isBug && !isTriaged) {
      await github.issues.createComment({
        issue_number: context.payload.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: botMessage
      })
    }
  } 
  else if (context.eventName === 'issue_comment' && context.payload.action === 'created') {
    if (context.payload.comment.body === '/triaged') {
      const comment = await botComment()

      if (isBug && isTriaged && comment !== undefined) {
        await github.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: comment.id,
          body: '👍 Thank you for triaging this issue.'
        })
      }

      await github.reactions.createForIssueComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: context.payload.comment.id,
        content: isTriaged ? '+1' : '-1' ,
      })
    } 
  }

  async function botComment() {
    const opts = github.issues.listComments.endpoint.merge({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.payload.issue.number
    })

    const comments = await github.paginate(opts)
    return comments.find(comment => comment.user.login == 'github-actions[bot]');
  }
}
