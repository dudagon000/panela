// 1) Cole aqui as credenciais do seu projeto Supabase (Project Settings > API).
const SUPABASE_URL = "https://bsygqyblebuivslglmxp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-KSIuhE8hXfGPb5fyTtNyw_0AnClY59";

const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.includes("COLE_AQUI");
const db = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = (id) => document.getElementById(id);
const state = { user:null, pantry:[], recipes:[], plan:{}, weekStart:"", shopping:[] };
const days = ["Segunda","Terça","Quarta","Quinta","Sexta","Sábado","Domingo"];
const categories = ["proteínas","acompanhamento","legumes","lanches"];
let toastTimer;

function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)}
function show(id){["setup-screen","auth-screen","app-screen"].forEach(x=>$(x).classList.toggle("hidden",x!==id))}
function safe(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function datePlusDays(date,n){const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function formatDate(s){if(!s)return "sem validade";return new Date(s+"T12:00:00").toLocaleDateString("pt-BR")}
function normalize(s){return String(s||"").trim().toLocaleLowerCase("pt-BR")}
function parseIngredientOption(text){
const p=text.split("|").map(x=>x.trim());
return {name:p[0]||"",quantity:Number(p[1])||0,unit:p[2]||"un"};
}
 
function parseIngredients(text){
return text.split("\n").map(line=>line.trim()).filter(Boolean).map(line=>{
  const options=line.split(/\s+OU\s+/i).map(parseIngredientOption).filter(x=>x.name);
  return options.length>1?{type:"alternative",options}:options[0];
}).filter(Boolean);
}
 
function ingredientText(items){
return items.map(i=>{
  if(i.type==="alternative"&&Array.isArray(i.options)){
   return i.options.map(o=>`${o.name} | ${o.quantity} | ${o.unit}`).join(" OU ");
  }
  return `${i.name} | ${i.quantity} | ${i.unit}`;
}).join("\n");
}
 
function ingredientLabel(i){
if(i.type==="alternative"&&Array.isArray(i.options)){
  return i.options.map(o=>`${o.name} — ${o.quantity} ${o.unit}`).join(" OU ");
}
return `${i.name} — ${i.quantity} ${i.unit}`;
}
 
function chosenIngredient(recipe,item,index){
if(item.type!=="alternative"||!Array.isArray(item.options)||!item.options.length)return item;
const key=`${recipe.id}-${index}`;
const choice=Number(state.ingredientChoices[key]??0);
return item.options[Math.min(Math.max(choice,0),item.options.length-1)];
}
function todayISO(){return new Date().toISOString().slice(0,10)}
function weekMonday(date){const d=new Date(date+"T12:00:00");const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.toISOString().slice(0,10)}

async function authInit(){
  if(!configured){show("setup-screen");return}
  const {data:{session}}=await db.auth.getSession();
  if(session){state.user=session.user;await loadAll();show("app-screen");$("user-label").textContent=session.user.email}
  else show("auth-screen");
  db.auth.onAuthStateChange(async(_event,session)=>{if(session){state.user=session.user;$("user-label").textContent=session.user.email;await loadAll();show("app-screen")}else{state.user=null;show("auth-screen")}});
}
$("auth-form").addEventListener("submit",async e=>{e.preventDefault();$("auth-message").textContent="Entrando…";const email=$("auth-email").value,password=$("auth-password").value;const {error}=await db.auth.signInWithPassword({email,password});$("auth-message").textContent=error?error.message:"";});
$("signup-btn").addEventListener("click",async()=>{const email=$("auth-email").value,password=$("auth-password").value;if(!email||password.length<6){$("auth-message").textContent="Informe e-mail e uma senha com pelo menos 6 caracteres.";return}const {error}=await db.auth.signUp({email,password});$("auth-message").textContent=error?error.message:"Cadastro iniciado! Se a confirmação de e-mail estiver ativa, confira sua caixa de entrada.";});
$("logout-btn").addEventListener("click",async()=>{await db.auth.signOut()});

async function loadAll(){await Promise.all([loadPantry(),loadRecipes(),loadPlan()]);renderAll();$("logout-btn").classList.remove("hidden");if(!$("week-start").value)$("week-start").value=weekMonday(todayISO());}
async function loadPantry(){const {data,error}=await db.from("pantry_items").select("*").order("expiry_date",{ascending:true,nullsFirst:false});if(error){toast(error.message);return}state.pantry=data||[]}
async function loadRecipes(){const {data,error}=await db.from("recipes").select("*").order("name");if(error){toast(error.message);return}state.recipes=data||[]}
async function loadPlan(){const start=$("week-start").value||weekMonday(todayISO());state.weekStart=start;const {data,error}=await db.from("meal_plans").select("*").eq("week_start",start);if(error){toast(error.message);return}state.plan={};(data||[]).forEach(x=>state.plan[`${x.day_index}-${x.meal_type}`]=x.recipe_id||"")}
function renderAll(){renderPantry();renderRecipes();renderPlanner();renderShopping();renderPrep()}
function renderPantry(){
 const el=$("pantry-list");if(!state.pantry.length){el.innerHTML='<div class="empty-state">Sua geladeira está esperando os primeiros ingredientes. 🥬</div>';return}
 el.innerHTML=state.pantry.map(x=>{const daysLeft=x.expiry_date?Math.ceil((new Date(x.expiry_date+"T12:00:00")-new Date(todayISO()+"T12:00:00"))/86400000):null;return `<article class="pantry-item"><div class="item-top"><span class="item-name">${safe(x.name)}</span><button class="delete-btn" data-delete-pantry="${x.id}" aria-label="Excluir">×</button></div><div class="item-meta">${x.quantity??""} ${safe(x.unit||"")}</div><div class="item-meta"><span class="expiry ${daysLeft!==null&&daysLeft<=3?"soon":""}">${x.expiry_date?(daysLeft<0?"Vencido":daysLeft===0?"Vence hoje":daysLeft<=3?`Vence em ${daysLeft} dia(s)`:`Validade: ${formatDate(x.expiry_date)}`):"Sem validade informada"}</span></div></article>`}).join("");
 el.querySelectorAll("[data-delete-pantry]").forEach(b=>b.onclick=()=>deletePantry(b.dataset.deletePantry));
}
$("pantry-form").addEventListener("submit",async e=>{e.preventDefault();const item={user_id:state.user.id,name:$("pantry-name").value.trim(),quantity:Number($("pantry-quantity").value)||0,unit:$("pantry-unit").value,expiry_date:$("pantry-expiry").value||null};const {error}=await db.from("pantry_items").insert(item);if(error){toast(error.message);return}e.target.reset();await loadPantry();renderPantry();toast("Ingrediente adicionado! ♡")});
async function deletePantry(id){const {error}=await db.from("pantry_items").delete().eq("id",id);if(error){toast(error.message);return}await loadPantry();renderPantry();toast("Ingrediente removido.")}

$("recipe-form").addEventListener("submit",async e=>{e.preventDefault();const id=$("recipe-id").value;const row={user_id:state.user.id,name:$("recipe-name").value.trim(),category:$("recipe-category").value,difficulty:$("recipe-difficulty").value,servings:Number($("recipe-servings").value),ingredients:parseIngredients($("recipe-ingredients").value),method:$("recipe-method").value.trim()};const req=id?db.from("recipes").update(row).eq("id",id):db.from("recipes").insert(row);const {error}=await req;if(error){$("recipe-message").textContent=error.message;return}resetRecipeForm();await loadRecipes();renderRecipes();renderPlanner();renderShopping();renderPrep();toast(id?"Receita atualizada!":"Receita guardada no caderninho! ♡")});
function resetRecipeForm(){$("recipe-form").reset();$("recipe-id").value="";$("recipe-servings").value=2;$("recipe-save").textContent="Salvar receita";$("recipe-cancel").classList.add("hidden");$("recipe-message").textContent=""}
$("recipe-cancel").onclick=resetRecipeForm;
function editRecipe(id){const r=state.recipes.find(x=>x.id===id);if(!r)return;$("recipe-id").value=r.id;$("recipe-name").value=r.name;$("recipe-category").value=r.category;$("recipe-difficulty").value=r.difficulty;$("recipe-servings").value=r.servings;$("recipe-ingredients").value=ingredientText(r.ingredients||[]);$("recipe-method").value=r.method;$("recipe-save").textContent="Salvar alterações";$("recipe-cancel").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
async function deleteRecipe(id){if(!confirm("Excluir esta receita do caderninho?"))return;const {error}=await db.from("recipes").delete().eq("id",id);if(error){toast(error.message);return}await loadRecipes();await loadPlan();renderAll();toast("Receita excluída.")}
function renderRecipes(){const el=$("recipe-list");if(!state.recipes.length){el.innerHTML='<div class="empty-state">Seu caderninho ainda está em branco. Cadastre a primeira receita ali em cima! 🍓</div>';return}el.innerHTML=state.recipes.map(r=>`<article class="recipe-card"><div class="card-top"><h3>${safe(r.name)}</h3><span class="tag">${safe(r.category)}</span></div><div class="recipe-tags"><span class="tag green">${safe(r.difficulty)}</span><span class="tag">${r.servings} porções</span></div><div class="ingredient-preview">${(r.ingredients||[]).map(i=>`• ${safe(i.name)} — ${safe(i.quantity)} ${safe(i.unit)}`).join("\n")}</div><details><summary class="mini-btn">Ver preparo</summary><p class="muted" style="white-space:pre-line;margin-top:10px">${safe(r.method)}</p></details><div class="recipe-actions"><button class="mini-btn" data-edit="${r.id}">Editar</button><button class="mini-btn" data-delete-recipe="${r.id}">Excluir</button></div></article>`).join("");el.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editRecipe(b.dataset.edit));el.querySelectorAll("[data-delete-recipe]").forEach(b=>b.onclick=()=>deleteRecipe(b.dataset.deleteRecipe))}

function mealSlots(){const slots=[];for(let d=0;d<5;d++){slots.push({d,type:"almoço",label:"Almoço"});slots.push({d,type:"jantar",label:"Jantar"})}slots.push({d:5,type:"almoço",label:"Almoço"},{d:5,type:"jantar",label:"Lanche"},{d:6,type:"almoço",label:"Almoço"},{d:6,type:"jantar",label:"Lanche"});return slots}
function recipeOptions(slot){let allowed=slot.label==="Lanche"?["lanches"]:categories.filter(c=>c!=="lanches");return state.recipes.filter(r=>allowed.includes(r.category))}
function renderPlanner(){const el=$("planner-grid");if(!$("week-start").value)$("week-start").value=weekMonday(todayISO());const start=$("week-start").value;state.weekStart=start;el.innerHTML=days.map((day,d)=>{const slots=mealSlots().filter(s=>s.d===d);return `<article class="day-card"><div class="day-title">${day} · ${formatDate(datePlusDays(start,d))}</div>${slots.map(s=>{const key=`${d}-${s.type}`,options=recipeOptions(s),selected=state.plan[key]||"";return `<div class="meal-row"><label>${s.label}</label><select data-slot="${key}"><option value="">— escolher receita —</option>${options.map(r=>`<option value="${r.id}" ${selected===r.id?"selected":""}>${safe(r.name)}</option>`).join("")}</select></div>`}).join("")}</article>`}).join("");el.querySelectorAll("[data-slot]").forEach(sel=>sel.onchange=()=>{state.plan[sel.dataset.slot]=sel.value;renderShopping();renderPrep()})}
$("week-start").addEventListener("change",async()=>{await loadPlan();renderPlanner();renderShopping();renderPrep()});
$("generate-plan").onclick=()=>{const slots=mealSlots();const pool=state.recipes; if(!pool.length){toast("Cadastre algumas receitas primeiro.");return}const pantryNames=new Set(state.pantry.map(x=>normalize(x.name)));const score=r=>(r.ingredients||[]).filter(i=>pantryNames.has(normalize(i.name))).length;const choose=(arr)=>arr.slice().sort((a,b)=>score(b)-score(a))[0];const used={};slots.forEach(s=>{const key=`${s.d}-${s.type}`;const opts=recipeOptions(s);if(opts.length){const ranked=opts.slice().sort((a,b)=>score(b)-score(a));const choice=ranked.find(r=>(used[r.id]||0)<(r.category==="proteínas"?2:3))||ranked[0];state.plan[key]=choice.id;used[choice.id]=(used[choice.id]||0)+1}});renderPlanner();renderShopping();renderPrep();toast("Sugestão montada priorizando o que você já tem! ♡")};
$("save-plan").onclick=async()=>{const start=$("week-start").value;const rows=mealSlots().filter(s=>state.plan[`${s.d}-${s.type}`]).map(s=>({user_id:state.user.id,week_start:start,day_index:s.d,meal_type:s.type,recipe_id:state.plan[`${s.d}-${s.type}`]}));const {error:delError}=await db.from("meal_plans").delete().eq("week_start",start);if(delError){toast(delError.message);return}if(rows.length){const {error}=await db.from("meal_plans").insert(rows);if(error){toast(error.message);return}}toast("Cardápio salvo! ♡")};

function getSelectedRecipes(){const ids=Object.values(state.plan).filter(Boolean);return ids.map(id=>state.recipes.find(r=>r.id===id)).filter(Boolean)}
function renderShopping(){const totals=new Map();getSelectedRecipes().forEach(r=>(r.ingredients||[]).forEach(i=>{const key=normalize(i.name)+"|"+normalize(i.unit);const old=totals.get(key)||{name:i.name,quantity:0,unit:i.unit};old.quantity+=Number(i.quantity)||0;totals.set(key,old)}));const pantry=new Map();state.pantry.forEach(i=>{const k=normalize(i.name);pantry.set(k,(pantry.get(k)||0)+(Number(i.quantity)||0))});state.shopping=[...totals.values()].filter(i=>(pantry.get(normalize(i.name))||0)<i.quantity).map(i=>({...i,missing:Math.max(0,i.quantity-(pantry.get(normalize(i.name))||0))}));const el=$("shopping-list");if(!state.shopping.length){el.innerHTML='<div class="empty-state">Sua lista está vazia por enquanto. Monte um cardápio e confira o que falta. 🛒</div>';return}el.innerHTML=state.shopping.map(i=>`<label class="shopping-row"><input type="checkbox"><span>${safe(i.name)}</span><small>${i.missing} ${safe(i.unit)} faltando</small></label>`).join("")}
$("refresh-shopping").onclick=()=>{renderShopping();toast("Lista atualizada.")};
$("copy-shopping").onclick=async()=>{const text=state.shopping.map(i=>`[ ] ${i.name}: ${i.missing} ${i.unit}`).join("\n");if(!text){toast("Sua lista está vazia.");return}try{await navigator.clipboard.writeText(text);toast("Lista copiada!")}catch{toast("Não foi possível copiar neste navegador.")}};
function renderPrep(){const recipes=getSelectedRecipes();const counts=new Map();recipes.forEach(r=>(r.ingredients||[]).forEach(i=>{const k=normalize(i.name);const v=counts.get(k)||{name:i.name,count:0,recipes:[]};v.count++;v.recipes.push(r.name);counts.set(k,v)}));const shared=[...counts.values()].filter(x=>x.count>1);const soon=state.pantry.filter(x=>x.expiry_date&&Math.ceil((new Date(x.expiry_date+"T12:00:00")-new Date(todayISO()+"T12:00:00"))/86400000)<=3);const el=$("prep-content");el.innerHTML=`<article class="prep-card"><h3>Ingredientes em comum</h3>${shared.length?shared.map(x=>`<p><b>${safe(x.name)}</b> aparece em ${x.count} preparos: ${x.recipes.map(safe).join(", ")}. Considere higienizar, cortar ou porcionar tudo de uma vez.</p>`).join("<hr>"):'<p>Quando houver receitas selecionadas com ingredientes repetidos, eles aparecerão aqui.</p>'}</article><article class="prep-card"><h3>Use antes que vença</h3>${soon.length?soon.map(x=>`<p><b>${safe(x.name)}</b> — ${formatDate(x.expiry_date)}. Tente incluir esse ingrediente nas próximas refeições.</p>`).join(""):'<p>Nenhum ingrediente cadastrado com vencimento nos próximos três dias. Que beleza! ♡</p>'}</article><article class="prep-card"><h3>Ideias para adiantar</h3><p>• Lave e seque folhas de uma vez, guardando-as bem fechadas.</p><p>• Separe temperos e porções de proteínas antes de cozinhar.</p><p>• Aproveite o mesmo corte de legumes em mais de uma receita.</p></article>`}
function initNavigation() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.view;
 
      document.querySelectorAll(".tab").forEach(item => {
        item.classList.toggle("active", item === tab);
      });
 
      document.querySelectorAll(".view").forEach(view => {
        view.classList.toggle(
          "hidden",
          view.id !== `view-${target}`
        );
      });
 
      if (target === "shopping") renderShopping();
      if (target === "prep") renderPrep();
    });
  });
}
 
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  authInit();
});
