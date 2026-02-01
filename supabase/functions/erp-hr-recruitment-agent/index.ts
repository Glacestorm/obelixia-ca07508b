import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecruitmentRequest {
  action: 'parse_cv' | 'score_candidate' | 'cultural_fit' | 'generate_rejection_email' | 
          'generate_interview_invite' | 'suggest_questions' | 'rank_candidates' | 'analyze_candidate';
  companyId: string;
  candidateId?: string;
  jobOpeningId?: string;
  cvContent?: string;
  cvUrl?: string;
  candidateData?: Record<string, unknown>;
  positionData?: Record<string, unknown>;
  interviewType?: string;
  interviewMode?: string;
  scheduledAt?: string;
  candidateName?: string;
  candidateEmail?: string;
  companyName?: string;
  positionTitle?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: RecruitmentRequest = await req.json();
    const { action, companyId } = request;

    console.log(`[erp-hr-recruitment-agent] Action: ${action}, Company: ${companyId}`);

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'parse_cv':
        systemPrompt = `Eres un experto en análisis de CVs y currículums vitae.
Tu tarea es extraer información estructurada del CV proporcionado.

EXTRAE LA SIGUIENTE INFORMACIÓN EN FORMATO JSON:
{
  "personal": {
    "full_name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string | null"
  },
  "summary": "string (resumen profesional)",
  "experience": [
    {
      "company": "string",
      "position": "string",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM | present",
      "responsibilities": ["string"],
      "achievements": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "year": "YYYY"
    }
  ],
  "skills": {
    "technical": ["string"],
    "soft": ["string"],
    "languages": [{"language": "string", "level": "string"}]
  },
  "certifications": ["string"],
  "total_years_experience": number
}`;

        userPrompt = `Analiza el siguiente CV y extrae la información estructurada:\n\n${request.cvContent || 'CV no proporcionado'}`;
        break;

      case 'score_candidate':
        systemPrompt = `Eres un experto en evaluación de candidatos para procesos de selección.
Analiza la compatibilidad entre el candidato y el puesto.

RESPONDE EN FORMATO JSON:
{
  "overall_score": 0-100,
  "category_scores": {
    "experience_match": 0-100,
    "skills_match": 0-100,
    "education_match": 0-100,
    "certifications_match": 0-100
  },
  "strengths": ["string"],
  "gaps": ["string"],
  "recommendation": "hire" | "consider" | "reject",
  "recommendation_reason": "string",
  "interview_focus_areas": ["string"],
  "salary_expectation_fit": "below" | "within" | "above" | "unknown"
}`;

        userPrompt = `CANDIDATO:\n${JSON.stringify(request.candidateData, null, 2)}\n\nPUESTO:\n${JSON.stringify(request.positionData, null, 2)}`;
        break;

      case 'cultural_fit':
        systemPrompt = `Eres un experto en cultura organizacional y fit cultural.
Evalúa el encaje cultural del candidato con la organización.

RESPONDE EN FORMATO JSON:
{
  "cultural_fit_score": 0-100,
  "values_alignment": {
    "teamwork": 0-100,
    "innovation": 0-100,
    "customer_focus": 0-100,
    "integrity": 0-100,
    "growth_mindset": 0-100
  },
  "work_style_indicators": ["string"],
  "potential_cultural_challenges": ["string"],
  "integration_recommendations": ["string"],
  "team_dynamics_prediction": "string"
}`;

        userPrompt = `Evalúa el fit cultural del candidato:\n${JSON.stringify(request.candidateData, null, 2)}`;
        break;

      case 'generate_rejection_email':
        systemPrompt = `Eres un experto en comunicación corporativa y employer branding.
Genera un email de rechazo profesional, empático y que mantenga una buena imagen de la empresa.

RESPONDE EN FORMATO JSON:
{
  "subject": "string",
  "body": "string (en HTML)",
  "tone": "professional" | "warm" | "encouraging"
}`;

        userPrompt = `Genera email de rechazo para:
Candidato: ${request.candidateName}
Puesto: ${request.positionTitle}
Empresa: ${request.companyName}
Motivo (interno): ${request.candidateData?.rejection_reason || 'Otros candidatos más alineados con el perfil'}`;
        break;

      case 'generate_interview_invite':
        systemPrompt = `Eres un experto en comunicación corporativa para procesos de selección.
Genera una invitación a entrevista profesional y acogedora.

RESPONDE EN FORMATO JSON:
{
  "subject": "string",
  "body": "string (en HTML)",
  "calendar_description": "string"
}`;

        userPrompt = `Genera invitación a entrevista:
Candidato: ${request.candidateName}
Email: ${request.candidateEmail}
Puesto: ${request.positionTitle}
Empresa: ${request.companyName}
Tipo entrevista: ${request.interviewType}
Modalidad: ${request.interviewMode}
Fecha/Hora: ${request.scheduledAt}`;
        break;

      case 'suggest_questions':
        systemPrompt = `Eres un experto en técnicas de entrevista y evaluación de candidatos.
Genera preguntas de entrevista personalizadas basadas en el CV y el puesto.

RESPONDE EN FORMATO JSON:
{
  "behavioral_questions": [
    {"question": "string", "what_to_look_for": "string", "red_flags": ["string"]}
  ],
  "technical_questions": [
    {"question": "string", "expected_answer_points": ["string"], "difficulty": "easy" | "medium" | "hard"}
  ],
  "situational_questions": [
    {"question": "string", "ideal_response_elements": ["string"]}
  ],
  "cv_specific_questions": [
    {"question": "string", "reason": "string"}
  ],
  "culture_fit_questions": [
    {"question": "string", "values_assessed": ["string"]}
  ]
}`;

        userPrompt = `Genera preguntas de entrevista para:
CANDIDATO:\n${JSON.stringify(request.candidateData, null, 2)}
PUESTO:\n${JSON.stringify(request.positionData, null, 2)}
TIPO ENTREVISTA: ${request.interviewType}`;
        break;

      case 'rank_candidates':
        systemPrompt = `Eres un experto en selección de personal y ranking de candidatos.
Ordena los candidatos por idoneidad para el puesto.

RESPONDE EN FORMATO JSON:
{
  "ranking": [
    {
      "candidate_id": "string",
      "rank": number,
      "overall_score": 0-100,
      "key_strengths": ["string"],
      "key_concerns": ["string"],
      "recommendation": "interview_first" | "interview" | "maybe" | "pass"
    }
  ],
  "top_pick_rationale": "string",
  "diversity_notes": "string"
}`;

        userPrompt = `Ordena estos candidatos para el puesto:\n${JSON.stringify(request.candidateData, null, 2)}`;
        break;

      case 'analyze_candidate':
        systemPrompt = `Eres un experto en análisis integral de candidatos.
Realiza un análisis completo del candidato para el proceso de selección.

RESPONDE EN FORMATO JSON:
{
  "executive_summary": "string",
  "overall_score": 0-100,
  "recommendation": "hire" | "consider" | "reject",
  "experience_analysis": {
    "years": number,
    "relevance_score": 0-100,
    "career_progression": "ascending" | "lateral" | "descending" | "mixed",
    "industry_match": boolean,
    "notable_achievements": ["string"]
  },
  "skills_analysis": {
    "technical_match": 0-100,
    "soft_skills_match": 0-100,
    "missing_skills": ["string"],
    "transferable_skills": ["string"]
  },
  "cultural_indicators": {
    "work_style": "string",
    "collaboration_tendency": "string",
    "leadership_potential": "string"
  },
  "risk_factors": ["string"],
  "interview_recommendations": {
    "focus_areas": ["string"],
    "suggested_interviewers": ["string (role)"],
    "estimated_interviews_needed": number
  },
  "salary_insights": {
    "market_positioning": "string",
    "negotiation_likelihood": "low" | "medium" | "high"
  }
}`;

        userPrompt = `Analiza integralmente este candidato:\n${JSON.stringify(request.candidateData, null, 2)}\n\nPara el puesto:\n${JSON.stringify(request.positionData, null, 2)}`;
        break;

      default:
        throw new Error(`Acción no soportada: ${action}`);
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[erp-hr-recruitment-agent] AI error: ${aiResponse.status}`, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Rate limit exceeded',
          message: 'Demasiadas solicitudes. Intenta más tarde.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from AI');
    }

    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { rawContent: content, parseError: true };
      }
    } catch (parseError) {
      console.error('[erp-hr-recruitment-agent] JSON parse error:', parseError);
      result = { rawContent: content, parseError: true };
    }

    // Si es score_candidate o analyze_candidate, actualizar el candidato en BD
    if ((action === 'score_candidate' || action === 'analyze_candidate') && request.candidateId) {
      await supabase
        .from('erp_hr_candidates')
        .update({
          ai_analysis: result,
          ai_score: result.overall_score,
          ai_recommendation: result.recommendation,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.candidateId);
    }

    console.log(`[erp-hr-recruitment-agent] Success: ${action}`);

    return new Response(JSON.stringify({
      success: true,
      action,
      data: result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[erp-hr-recruitment-agent] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
