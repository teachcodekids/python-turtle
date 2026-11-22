const projectWords = {
  th: {
    projects:'โปรเจกต์ของฉัน', newProject:'โปรเจกต์ใหม่', back:'โปรเจกต์ของฉัน', save:'บันทึกโปรเจกต์',
    name:'ชื่อโปรเจกต์', untitled:'โปรเจกต์ไม่มีชื่อ', localInfo:'โปรเจกต์จะบันทึกไว้ในเบราว์เซอร์นี้',
    loading:'กำลังโหลดโปรเจกต์…',
    loadError:'โหลดโปรเจกต์ไม่สำเร็จ', openError:'เปิดโปรเจกต์ไม่สำเร็จ', retry:'ลองใหม่',
    saved:'บันทึกแล้ว', saving:'กำลังบันทึก…', saveError:'บันทึกไม่สำเร็จ ลองอีกครั้ง',
    enterName:'กรุณาใส่ชื่อโปรเจกต์', tooLarge:'โค้ดยาวเกินขนาดที่บันทึกได้',
    discard:'ยังมีการแก้ไขที่ไม่ได้บันทึก ต้องการออกจากโปรเจกต์นี้หรือไม่',
  },
  en: {
    projects:'My Projects', newProject:'New Project', back:'My Projects', save:'Save Project',
    name:'Project name', untitled:'Untitled project', localInfo:'Projects are saved in this browser.',
    loading:'Loading projects…',
    loadError:'Could not load projects.', openError:'Could not open this project.', retry:'Try again',
    saved:'Saved', saving:'Saving…', saveError:'Could not save. Try again.',
    enterName:'Enter a project name.', tooLarge:'The code is too large to save.',
    discard:'You have unsaved changes. Leave this project?',
  },
};
const projectText = key => projectWords[language.value][key];
const home = byId('projects-home');
const projectEditor = byId('project-editor');
const projectName = byId('project-name');
const projectGrid = byId('project-grid');
const newProject = byId('new-project');
const saveProject = byId('save-project');
const backToProjects = byId('back-to-projects');
const retryProjects = byId('retry-projects');
let projects = [];
let currentProject = null;
let loadingProjects = false;
let opening = false;
let saving = false;
let homeNotice = '';
let editorNotice = '';

const storageKey = 'python-turtle-projects:' + new URL('.', location.href).pathname;

function readProjects() {
  return JSON.parse(localStorage.getItem(storageKey) ?? '[]');
}

async function projectRequest(path = '', options) {
  const saved = readProjects();
  if (!path) {
    return {projects:saved.sort((a,b) => b.updated_at.localeCompare(a.updated_at))};
  }
  const id = path.slice(1);
  if (options?.method === 'PUT') {
    const {name,code} = JSON.parse(options.body);
    const project = {id,name,code,updated_at:new Date().toISOString()};
    localStorage.setItem(storageKey, JSON.stringify([project,...saved.filter(item => item.id !== id)]));
    return project;
  }
  const project = saved.find(item => item.id === id);
  if (!project) throw new Error('Project not found');
  return project;
}

function updateProjectText() {
  document.querySelectorAll('[data-project-text]').forEach(node => {
    node.textContent = projectText(node.dataset.projectText);
  });
  projectName.placeholder = projectText('name');
  projectName.setAttribute('aria-label', projectText('name'));
  byId('home-notice').textContent = homeNotice ? projectText(homeNotice) : '';
  byId('save-status').textContent = editorNotice ? projectText(editorNotice) : '';
  retryProjects.hidden = homeNotice !== 'loadError';
}

function renderProjects() {
  const dateFormat = new Intl.DateTimeFormat(language.value, {dateStyle:'medium'});
  const cards = projects.map(project => {
    const button = document.createElement('button');
    button.className = 'project-card';
    const name = document.createElement('strong');
    name.textContent = project.name;
    const date = document.createElement('time');
    date.dateTime = project.updated_at;
    date.textContent = dateFormat.format(new Date(project.updated_at));
    button.append(name, date);
    button.onclick = () => openSavedProject(project.id);
    return button;
  });
  projectGrid.replaceChildren(newProject, ...cards);
  updateProjectText();
}

async function loadProjects() {
  loadingProjects = true;
  newProject.disabled = true;
  homeNotice = 'loading';
  updateProjectText();
  try {
    ({projects} = await projectRequest());
    homeNotice = '';
  } catch {
    homeNotice = 'loadError';
  } finally {
    loadingProjects = false;
    newProject.disabled = false;
    renderProjects();
  }
}

function showProject(project) {
  currentProject = project;
  projectName.value = project.name;
  editor.value = project.code;
  renderEditor();
  byId('clear-picture').click();
  messages.textContent = '';
  setStatus('ready');
  editorNotice = '';
  home.hidden = true;
  projectEditor.hidden = false;
  updateProjectText();
  projectName.focus();
}

async function openSavedProject(id) {
  if (opening || loadingProjects) return;
  opening = true;
  try {
    showProject(await projectRequest('/' + id));
  } catch {
    homeNotice = 'openError';
    updateProjectText();
  } finally {
    opening = false;
  }
}

function hasEdits() {
  return currentProject && (currentProject.code !== editor.value || currentProject.name !== projectName.value);
}

newProject.onclick = () => {
  if (opening || loadingProjects) return;
  showProject({id:crypto.randomUUID(), name:projectText('untitled'), code:''});
  projectName.select();
};
retryProjects.onclick = loadProjects;
backToProjects.onclick = () => {
  if (saving || (hasEdits() && !confirm(projectText('discard')))) return;
  if (running) stop('stopped');
  currentProject = null;
  projectEditor.hidden = true;
  home.hidden = false;
  byId('projects-heading').focus();
  loadProjects();
};
saveProject.onclick = async () => {
  if (!currentProject || saving) return;
  const name = projectName.value.trim();
  const code = editor.value;
  if (!name || code.length > 100000) {
    editorNotice = name ? 'tooLarge' : 'enterName';
    updateProjectText();
    return;
  }
  saving = true;
  saveProject.disabled = true;
  backToProjects.disabled = true;
  editorNotice = 'saving';
  updateProjectText();
  try {
    const saved = await projectRequest('/' + currentProject.id, {
      method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,code})
    });
    currentProject = {...saved,code};
    if (projectName.value.trim() === name) projectName.value = saved.name;
    editorNotice = 'saved';
  } catch {
    editorNotice = 'saveError';
  } finally {
    saving = false;
    saveProject.disabled = false;
    backToProjects.disabled = false;
    updateProjectText();
  }
};
language.addEventListener('change',renderProjects);
window.addEventListener('beforeunload', event => {
  if (!hasEdits() && !saving) return;
  event.preventDefault();
  event.returnValue = '';
});
loadProjects();
