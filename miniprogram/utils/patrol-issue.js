/** 巡检问题录入（对齐 PC patrol-control.js） */
const MAX_IMAGES = 4;

function createEmptyIssue(id) {
  return {
    id: id || 'issue-' + Date.now(),
    desc: '',
    issueDescSource: '',
    issueDescVoice: null,
    images: [],
    attachments: []
  };
}

function hasDescOrVoice(issue) {
  issue = issue || {};
  const desc = String(issue.desc || '').trim();
  const v = issue.issueDescVoice;
  const hasVoice = !!(v && (v.durationSec || v.tempFilePath || v.recordedAt));
  return !!desc || hasVoice;
}

function resolveIssueDescSource(issue) {
  const desc = String(issue.desc || '').trim();
  const v = issue.issueDescVoice;
  const hasVoice = !!(v && (v.durationSec || v.tempFilePath || v.recordedAt));
  if (hasVoice && desc) return 'voice+text';
  if (hasVoice) return 'voice';
  if (desc) return 'text';
  return '';
}

function getIssueDisplayDesc(issue) {
  issue = issue || {};
  const desc = String(issue.desc || '').trim();
  if (desc) return desc;
  if (issue.issueDescVoice && issue.issueDescVoice.transcript) {
    return issue.issueDescVoice.transcript;
  }
  if (hasDescOrVoice(issue) && issue.issueDescVoice) return '（语音描述）';
  return '';
}

function validateIssues(issues) {
  if (!issues || !issues.length) {
    return { ok: false, message: '请至少添加一个问题' };
  }
  for (let i = 0; i < issues.length; i++) {
    if (!hasDescOrVoice(issues[i])) {
      return { ok: false, message: '问题' + (i + 1) + '须填写文字描述或录入语音' };
    }
    if ((issues[i].images || []).length > MAX_IMAGES) {
      return { ok: false, message: '每个问题最多上传 ' + MAX_IMAGES + ' 张图片' };
    }
  }
  return { ok: true };
}

/** 远程/自动子项问题（对齐 PC scope=subtask：仅文字描述必填） */
function validateSubtaskIssues(issues) {
  if (!issues || !issues.length) {
    return { ok: false, message: '请至少添加一个问题并填写描述' };
  }
  for (let i = 0; i < issues.length; i++) {
    if (!String(issues[i].desc || '').trim()) {
      return { ok: false, message: '问题' + (i + 1) + '请填写问题描述' };
    }
    if ((issues[i].images || []).length > MAX_IMAGES) {
      return { ok: false, message: '每个问题最多上传 ' + MAX_IMAGES + ' 张图片' };
    }
  }
  return { ok: true };
}

function serializeIssuesForSubmit(issues) {
  return (issues || []).map(function (issue, idx) {
    const desc = String(issue.desc || '').trim();
    let voice = issue.issueDescVoice ? Object.assign({}, issue.issueDescVoice) : null;
    if (voice && desc) voice.transcript = desc;
    return {
      id: issue.id || ('gp-issue-' + (idx + 1)),
      desc: desc,
      issueDescSource: resolveIssueDescSource(issue),
      issueDescVoice: voice,
      images: (issue.images || []).map(function (img) {
        return {
          path: img.path,
          previewUrl: img.path,
          label: img.name || img.label || '图片',
          tone: 'default'
        };
      }),
      attachments: (issue.attachments || []).map(function (att) {
        return {
          type: att.type || 'video',
          name: att.name,
          label: att.label || att.name,
          path: att.path,
          durationSec: att.durationSec || 0
        };
      })
    };
  });
}

function normalizeIssuesFromPointResult(pr) {
  pr = pr || {};
  if (Array.isArray(pr.issues) && pr.issues.length) {
    return pr.issues.map(function (iss, idx) {
      return {
        id: iss.id || ('issue-' + idx),
        desc: iss.desc || '',
        issueDescSource: iss.issueDescSource || '',
        issueDescVoice: iss.issueDescVoice || null,
        images: (iss.images || []).map(function (img) {
          return {
            path: img.path || img.previewUrl,
            name: img.label || img.name || '图片'
          };
        }),
        attachments: (iss.attachments || []).slice()
      };
    });
  }
  if (pr.issueDesc || pr.issueDescVoice) {
    return [{
      id: 'issue-1',
      desc: pr.issueDesc || '',
      issueDescSource: pr.issueDescSource || 'text',
      issueDescVoice: pr.issueDescVoice || null,
      images: pr.issueImages || [],
      attachments: pr.attachments || []
    }];
  }
  return [];
}

module.exports = {
  MAX_IMAGES: MAX_IMAGES,
  createEmptyIssue: createEmptyIssue,
  hasDescOrVoice: hasDescOrVoice,
  getIssueDisplayDesc: getIssueDisplayDesc,
  validateIssues: validateIssues,
  validateSubtaskIssues: validateSubtaskIssues,
  serializeIssuesForSubmit: serializeIssuesForSubmit,
  normalizeIssuesFromPointResult: normalizeIssuesFromPointResult
};
