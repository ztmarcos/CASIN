import os
import fitz  # PyMuPDF
import openai
from google.oauth2 import service_account
from googleapiclient.discovery import build
from flask import Flask, render_template, request, flash, redirect, url_for
import csv
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email import encoders
import logging
import math
import time

from werkzeug.utils import secure_filename
import io
import json

# Try to import dotenv, but don't fail if it's not available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    def load_dotenv():
        pass
    print("Warning: python-dotenv not installed. Using environment variables directly.")

app = Flask(__name__)
app.secret_key = os.urandom(24)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max-limit

# Ensure the upload folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Making 'enumerate' available in Jinja2 templates
app.jinja_env.globals.update(enumerate=enumerate)

UPLOAD_FOLDER = 'uploads'
PARSED_FOLDER = 'parsed'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(PARSED_FOLDER):
    os.makedirs(PARSED_FOLDER)

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize environment
load_dotenv()

# Use environment variables with fallbacks
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'your-default-key-here')
SERVICE_ACCOUNT_FILE = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'pdfcasin-1091c7357015.json')
SHEET_ID = os.getenv('SHEET_ID', '1-4PNzgTdf3KBm805lNyxnN9dwFc2_45iXeu35grdH2M')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
ALLOWED_EXTENSIONS = {'pdf'}

# Gmail configuration
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_ADDRESS = 'casindb46@gmail.com'
EMAIL_PASSWORD = 'xlmf kbcp asxw kdkr'

# Replace the Google credentials setup
if 'GOOGLE_CREDENTIALS' in os.environ:
    google_creds = json.loads(os.environ.get('GOOGLE_CREDENTIALS'))
    with open('google_credentials.json', 'w') as f:
        json.dump(google_creds, f)
    SERVICE_ACCOUNT_FILE = 'google_credentials.json'

# Set the API key directly in environment variables
os.environ["OPENAI_API_KEY"] = "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"

# Initialize the OpenAI client
openai.api_key = os.getenv("OPENAI_API_KEY")

# Define prompts for each sheet
PROMPTS = {

    'Autos': 'Extrae los datos de la póliza de autos en formato CSV usando los nombres de columnas del sheet. For domicilio o dirección use double quotes. Asegúrate de que los valores largos estén entre comillas dobles sin ningun otro simbolo.',
    'GMM': 'Extract fetched columns from sheets in CSV format. Single line only. Asegúrate de que los valores largos como dirección estén entre comillas dobles sin ningun otro simbolo.',
    'Hogar': 'Extract fetched columns from sheets in CSV format. Single line only. Asegúrate de que los valores largos como dirección estén entre comillas dobles sin ningun otro simbolo.',
    'Transporte': 'Extract fetched columns from sheets in CSV format. Single line only. Asegúrate de que los valores largos como dirección estén entre comillas dobles sin ningun otro simbolo.',
    'Vida': 'Extract fetched columns from sheets in CSV format. Single line only. Asegúrate de que los valores largos como dirección estén entre comillas dobles sin ningun otro simbolo.', 
    'Mascotas': 'Extract fetched columns from sheets in CSV format. Single line only. Asegúrate de que los valores largos como dirección estén entre comillas dobles sin ningun otro simbolo.',
    'Negocio': 'Extract fetched columns from sheets in CSV format. Single line only. Asegúrate de que los valores largos estén entre comillas dobles sin ningun otro simbolo.',
    'Diversos': 'Extract fetched columns from sheets in CSV format. Single line only. Asegúrate de que los valores largos estén entre comillas dobles sin ningun otro simbolo.',
    'GruposGMM': {
        'instructions': (
            "Instrucciones para GPT (solo csv, no comentarios o simbolos extra):\n\n"
            "1. Extrae los datos de la carátula de la póliza (no incluyas nombre de columnas):\n"
            "   - Número de Póliza\n"
            "   - Contratante\n"
            "   - R.F.C.\n"
            "   - Domicilio\n"
            "   - Desde (Vigencia)\n"
            "   - Hasta (Vigencia)\n"
            "   - Forma de Pago\n"
            "   - Fecha de Expedición\n"
            "   - Planes\n"
            "   - Suma Asegurada\n"
            "   - Deducible\n"
            "   - Coaseguro\n"
            "   - Prima Neta\n"
            "   - Derecho de Póliza\n"
            "   - Recargo por Pago Fraccionado\n"
            "   - Prima Total\n"
            "   - I.V.A.\n"
            "   - Total a Pagar\n"
            "   - Nombre del Agente\n"
            "   - Clave Zona\n\n"
            "2. Extrae la lista de asegurados incluyendo el nombre de estas columnas nada más, evita incluir columnas de carátula:\n"
            "   - Status (siempre vigente)\n"
            "   - Número de Certificado\n"
            "   - Nombre Completo\n"
            "   - Sexo\n"
            "   - Edad\n"
            "   - Cobertura\n"
            "   - Suma Asegurada\n"
            "   - Prima\n"
            "   - Fecha de Antigüedad\n\n"
            "3. Devuelve los datos en formato CSV, asegurándote de que los valores largos estén entre comillas dobles. Agrega todas las comas vacias posibles para que se pueda leer bien el csv\n"
            "4. Ejemplo de formato CSV esperado para la carátula de la póliza y lista de asegurados:\n"
            "   12345,\"EMPRESA SA DE CV\",ABC123456DEF,\"CALLE EJEMPLO 123, COLONIA MUESTRA, CIUDAD, CP 12345\",01/01/2023,31/12/2023,Anual,15/12/2022,\"Plan A, Plan B\",1000000,5000,10,50000,500,1000,51500,8240,59740,\"JUAN PEREZ\",1234\n"
            "   Status,Número de Certificado,Nombre Completo,Sexo,Edad,Cobertura,Suma Asegurada,Prima,Fecha de Antigüedad\n"
            "   Vigente,001,\"RODRIGUEZ SANCHEZ MARIA\",F,35,\"Cobertura Amplia\",500000,2500,01/01/2020\n"
            "   Vigente,002,\"LOPEZ GARCIA JUAN\",M,42,\"Cobertura Básica\",300000,1800,15/03/2018\n\n"
        )
    },

}

# Definir el nuevo prompt para hojas no-Grupos
NON_GRUPOS_PROMPT = (
    "Instrucciones importantes:\n"
    "1. La dirección completa DEBE:\n"
    "   - Estar en un solo campo\n"
    "   - Incluir número exterior, interior, colonia, ciudad y código postal\n"
    "   - Estar encerrada entre comillas dobles\n"
    "   - NO usar símbolos como \\ o // dentro o fuera de las comillas\n"
    "   - Ejemplo correcto: \"Prolongacion Cristobal Colon No. 391, Colima, Colima, 28078\"\n"
    "2. Extrae SOLO los datos que coincidan con los nombres de columnas proporcionados.\n"
    "3. NO agregues columnas extra ni datos que no se ajusten a la estructura especificada.\n"
    "4. Si no encuentras una coincidencia para una columna, déjala en blanco en la salida.\n"
    "5. Usa SOLO los siguientes nombres de compañías como 'Aseguradora': GNP, Qualitas, ANA, HDI, SURA, MAPFRE. Usa solo nombres cortos.\n"
    "6. Asegúrate de que el campo 'Aseguradora' esté siempre presente y correctamente identificado.\n"
    "7. Para el tipo de pago: Si se menciona 'Contado', cmbialo a 'Anual'. Usa solo 'Anual'.\n"
    "8. Para la columna 'Pagos Fraccionados': Analiza la forma de pago y usa estos valores:\n"
    "   Anual: 0\n"
    "   Mensual: 12\n"
    "   Trimestral: 4\n"
    "   Semestral: 2\n"
    "9. 'Forma de pago' debe ser solo una de estas: Anual, Mensual, Trimestral, Semestral\n"
    "10. Todas las fechas deben estar en el formato dd/mm/aaaa\n"
    "11. 'No. de Pagos' siempre debe estar en blanco\n"
    "12. Todos los nombres deben estar en Mayúsculas y Minúsculas\n"
    "13. Deja 'e-mail' en blanco\n"
    "14. Deja 'PDF' en blanco\n"
    "15. Calcula 'Monto Parcial' como: (Pago total o Prima Total - Derecho de Póliza) / Pagos Fraccionados. Excepto para Gmm, donde es Pago total / Pagos Fraccionados. Redondea a 1 decimal.\n"
    "16. Asegúrate de que todos los valores numéricos estén sin comas ni símbolos $\n"
    "17. No incluyas nombres de columnas ni los ejemplos\n"
    "18. Asegúrate de que los valores numéricos y fechas no estén entre comillas.\n"
    "19. Verifica que cada columna tenga su valor correspondiente en el orden correcto.\n"
    "20. Usa una sola línea para el csv\n"
    "21. Para tipo de vehiculo deduce si es auto, moto o camion por la descripcion del vehiculo\n"
    "22. Solo para Gmm, el 'Monto Parcial' lo calculas como: Pago total / Pagos Fraccionados."
    "23. El número de póliza debe ser sin ceros de la izquierda"
)

# Define sender accounts
SENDER_ACCOUNTS = {
    'lorena': {
        'EMAIL_ADDRESS': 'lorenacasin5@gmail.com',
        'EMAIL_PASSWORD': 'klej sbcg pjmw oogg'
    },
    'michell': {
        'EMAIL_ADDRESS': 'michelldiaz.casinseguros@gmail.com',
        'EMAIL_PASSWORD': 'yxey swjx sicw goow'
    },
    'marcos': {
        'EMAIL_ADDRESS': 'casinseguros@gmail.com',
        'EMAIL_PASSWORD': 'espa jcga riyh sboq'
    }
}

# Marcos' email (all emails will be sent to Marcos)
MARCOS_EMAIL = 'casinseguros@gmail.com'

def generate_email_summary(parsed_data):
    csv_string = "\n".join([",".join(row) for row in parsed_data])
    summary_prompt = """Usa los datos de la poliza para completar el siguiente correo: Estimado(a) (usa nombre del cliente),

Tenemos el gusto de enviar la póliza (número) con inicio de vigencia (fecha de inicio) de la póliza de (ramo: (automóvil, moto o camión; especifica modelo), vida, gastos médicos, hogar), con un costo anual de (usar pago total o prima total de la poliza, agrega signo de $), de la compañía de seguros (compañía de seguros). 

Se adjunta carátula, condiciones generales y el aviso de cobro para su amable programación del pago; el plazo vence el (agregar manualmente) a las 12:00 del día, y puede ser liquidado mediante tarjeta de crédito, pagando con cheque o efectivo en ventanilla bancaria o transferencia como pago de servicios.

Agradecemos nos informe que forma de pago utilizará para poder apoyarle.

Importante: Favor de enviarnos su constancia de identificación fiscal para actualizar sus datos y emitir su factura con sus datos vigentes, una vez emitida, ya no podrán hacerse cambios.

Para dar cumplimiento a las disposiciones legales le agradecemos, nos dé acuse de recibido de este correo.

Firma: se pondrá manualmente con teléfonos y correo. Atentamente, Casin Seguros. NO haga comentarios extra al correo. Solo la data que te pido"""
    return gpt_process(f"{summary_prompt}\n\n{csv_string}", max_tokens=500)

def allowed_file(filename):
    return True  # This will allow all file types

def extract_text_from_pdf(pdf_path):
    document = fitz.open(pdf_path)
    text = ""
    for page_num in range(document.page_count):
        page = document.load_page(page_num)
        text += page.get_text("text")
    return text

def fetch_column_names(sheet_id, sheet_name):
    try:
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        service = build('sheets', 'v4', credentials=creds)
        sheet = service.spreadsheets()

        result = sheet.values().get(spreadsheetId=sheet_id, range=f"{sheet_name}!1:1").execute()
        columns = result.get('values', [[]])[0]

        logger.info(f"Fetched columns for sheet {sheet_name}: {columns}")
        if not columns:
            raise Exception("No columns fetched, check the Google Sheet configuration or range.")

        return columns
    except Exception as e:
        logger.error(f"Error fetching columns from Google Sheets: {e}")
        return []

def split_grupos_text(text, sheet_name):
    policy_end_markers = ["ASEGURADOS", "LISTA DE ASEGURADOS", "RELACIÓN DE ASEGURADOS"]
    lower_text = text.lower()
    split_index = len(text)
    
    for marker in policy_end_markers:
        index = lower_text.find(marker.lower())
        if index != -1 and index < split_index:
            split_index = index
    
    policy_text = text[:split_index].strip()
    insured_text = text[split_index:].strip()
    
    # Remove any headers from the insured text
    insured_lines = insured_text.split('\n')
    while insured_lines and any(marker.lower() in insured_lines[0].lower() for marker in policy_end_markers):
        insured_lines.pop(0)
    insured_text = '\n'.join(insured_lines)
    
    logger.debug(f"Policy text (first 200 chars): {policy_text[:200]}...")
    logger.debug(f"Insured text (first 200 chars): {insured_text[:200]}...")
    
    return policy_text, insured_text

def split_insured_list(insured_text):
    lines = insured_text.split('\n')
    chunk_size = 2000  # Increased from 50 to 200
    return ['\n'.join(lines[i:i+chunk_size]) for i in range(0, len(lines), chunk_size)]

def estimate_tokens(text):
    # Simple estimation: assume 4 characters per token on average
    return len(text) // 4

def process_chunk(prompt, specific_prompt):
    try:
        logger.info("Sending request to GPT")
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": specific_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,
            max_tokens=8000
        )
        result = response.choices[0].message.content.strip()
        logger.info("Received response from GPT")
        logger.debug(f"GPT Response (first 500 chars):\n{result[:1000]}...")
        lines = [line.strip() for line in result.split('\n') if line.strip()]
        return lines
    except Exception as e:
        logger.error(f"Error in chunk processing: {e}")
        return []

# Add these new functions

def process_grupos_gmm(text, columns):
    policy_text, insured_text = split_grupos_text(text, 'GruposGMM')
    specific_prompt = PROMPTS['GruposGMM']['instructions']
    
    # Process policy data
    policy_prompt = f"{specific_prompt}\n\nExtrae los datos de la póliza del siguiente texto:\n\n{policy_text}"
    policy_result = process_chunk(policy_prompt, specific_prompt)
    
    all_data = policy_result if policy_result else []
    
    if insured_text:
        insured_chunks = split_insured_list(insured_text)
        logger.info(f"Processing {len(insured_chunks)} chunks of insured data")
        
        for i, chunk in enumerate(insured_chunks):
            chunk_prompt = f"{specific_prompt}\n\nExtrae los datos de los asegurados del siguiente texto:\n\n{chunk}"
            chunk_result = process_chunk(chunk_prompt, specific_prompt)
            all_data.extend(chunk_result)
            
            logger.info(f"Processed chunk {i+1}/{len(insured_chunks)}")
    
    return all_data

def process_grupos_autos(text, columns):
    policy_text, insured_text = split_grupos_text(text, 'Grupos Autos')
    specific_prompt = PROMPTS['Grupos Autos']['instructions']
    
    # Process policy data
    policy_prompt = f"{specific_prompt}\n\nExtrae los datos de la póliza del siguiente texto:\n\n{policy_text}"
    policy_result = process_chunk(policy_prompt, specific_prompt)
    
    if not policy_result:
        logger.warning("No policy data extracted for Grupos Autos")
        return []
    
    policy_data = parse_response_to_csv(policy_result[0] if policy_result else "", columns)
    
    results = []
    if insured_text:
        insured_chunks = split_insured_list(insured_text)
        for chunk in insured_chunks:
            chunk_prompt = f"{specific_prompt}\n\nExtrae los datos de los vehículos asegurados del siguiente texto:\n\n{chunk}"
            chunk_result = process_chunk(chunk_prompt, specific_prompt)
            for insured_line in chunk_result:
                insured_data = parse_response_to_csv(insured_line, columns)
                combined_data = policy_data + insured_data[len(policy_data):]
                results.append(combined_data)
    else:
        results.append(policy_data)
    
    return results

def process_grupos_vida(text, columns):
    policy_text, insured_text = split_grupos_text(text, 'Grupos Vida')
    specific_prompt = PROMPTS['Grupos Vida']['instructions']
    
    # Process policy data
    policy_prompt = f"{specific_prompt}\n\nExtrae los datos de la póliza del siguiente texto:\n\n{policy_text}"
    policy_result = process_chunk(policy_prompt, specific_prompt)
    
    if not policy_result:
        logger.warning("No policy data extracted for Grupos Vida")
        return []
    
    policy_data = parse_response_to_csv(policy_result[0] if policy_result else "", columns)
    
    results = []
    if insured_text:
        insured_chunks = split_insured_list(insured_text)
        for chunk in insured_chunks:
            chunk_prompt = f"{specific_prompt}\n\nExtrae los datos de los asegurados del siguiente texto:\n\n{chunk}"
            chunk_result = process_chunk(chunk_prompt, specific_prompt)
            for insured_line in chunk_result:
                insured_data = parse_response_to_csv(insured_line, columns)
                combined_data = policy_data + insured_data[len(policy_data):]
                results.append(combined_data)
    else:
        results.append(policy_data)
    
    return results

def validate_grupos_gmm_data(lines, columns):
    pass
    validated_lines = []
    policy_columns = 20  # Adjust based on your specific requirements
    insured_columns = 9  # Adjust based on your specific requirements
    total_columns = policy_columns + insured_columns
    
    for line in lines:
        values = line.split(',')
        values = [v.strip('`"') for v in values if v.strip()]
        
        while len(values) < total_columns:
            values.append('')
        
        if len(values) > total_columns:
            values = values[:total_columns]
        
        validated_line = ','.join(f'"{v}"' if ',' in v else v for v in values)
        validated_lines.append(validated_line)
    
    return validated_lines

# Modify the parse_text_with_gpt function

def parse_text_with_gpt(texts, columns, sheet_name):
    logger.info(f"Using prompt for sheet '{sheet_name}'")
    
    if sheet_name in ['GruposGMM', 'Grupos Autos', 'Grupos Vida']:
        parsed_data = process_grupos_sheets(texts, columns, sheet_name)
    else:
        # Existing code for non-Grupos sheets
        logger.info("Processing non-Grupos sheet")
        specific_prompt = NON_GRUPOS_PROMPT
        
        # Include column names in the prompt
        column_names = ", ".join(columns)
        full_prompt = f"{specific_prompt}\n\nColumnas a extraer: {column_names}\n\nExtrae los datos del siguiente texto:\n\n{texts[0]}"
        
        logger.debug(f"Full prompt (first 500 chars): {full_prompt[:1000]}...")
        
        result = process_chunk(full_prompt, specific_prompt)
        logger.debug(f"Raw result from GPT: {result}")
        
        # Parse the CSV string returned by GPT
        parsed_data = parse_response_to_csv(result[0] if result else "", columns)
        logger.debug(f"Parsed data after validation: {parsed_data}")
        
        parsed_data = [parsed_data] if parsed_data else []
    
    return parsed_data

def process_grupos_sheets(texts, columns, sheet_name):
    all_parsed_data = []
    for i, text in enumerate(texts):
        logger.info(f"Processing file {i+1}/{len(texts)} for {sheet_name}")
        try:
            specific_prompt = PROMPTS[sheet_name]['instructions']
            full_prompt = f"{specific_prompt}\n\nExtrae los datos del siguiente texto:\n\n{text}"
            
            result = process_chunk(full_prompt, specific_prompt)
            logger.debug(f"Raw result from GPT for {sheet_name}: {result}")
            
            # The result should already be in CSV format
            csv_data = '\n'.join(result)
            
            # Parse the CSV data
            parsed_data = list(csv.reader(io.StringIO(csv_data)))
            all_parsed_data.extend(parsed_data)
            
        except Exception as e:
            logger.error(f"Error processing file {i+1} for {sheet_name}: {str(e)}")
    
    return all_parsed_data

def parse_response_to_csv(response_text, columns):
    try:
        # Use csv.reader to properly parse the CSV line
        csv_reader = csv.reader([response_text], quotechar='"', delimiter=',', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)
        data = next(csv_reader)

        # Ensure we have the expected number of columns
        expected_columns = len(columns)
        data = (data + [''] * expected_columns)[:expected_columns]

        return data
    except Exception as e:
        logger.error(f"Error parsing CSV data: {e}")
        return None

def validate_extracted_data(lines, columns):
    validated_lines = []
    expected_columns = len(columns)
    
    for line in lines:
        # Use csv.reader to properly parse the CSV line
        csv_reader = csv.reader(io.StringIO(line), quotechar='"', delimiter=',', quoting=csv.QUOTE_MINIMAL, skipinitialspace=True)
        values = next(csv_reader)
        
        # Ensure we have the expected number of columns
        values = (values + [''] * expected_columns)[:expected_columns]
        
        # Use csv.writer to properly format the CSV line
        output = io.StringIO()
        csv_writer = csv.writer(output, quotechar='"', delimiter=',', quoting=csv.QUOTE_MINIMAL)
        csv_writer.writerow(values)
        
        validated_line = output.getvalue().strip()
        validated_lines.append(validated_line)
    
    if not validated_lines:
        logger.warning("No valid lines after validation. Check the extraction process and validation rules.")
    else:
        logger.info(f"Validated {len(validated_lines)} lines")
    
    return validated_lines

def format_csv_string(parsed_text):
    lines = parsed_text.split('\n')
    csv_data = []
    for line in lines:
        if line.strip():
            reader = csv.reader([line], quotechar='"', delimiter=',', quoting=csv.QUOTE_ALL, skipinitialspace=True)
            fields = next(reader)
            csv_data.append(fields)
    return csv_data

def append_csv_to_google_sheet(sheet_id, csv_data, range_name):
    logger.info(f"Attempting to append data to sheet {sheet_id}, range {range_name}")
    try:
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        service = build('sheets', 'v4', credentials=creds)
        sheet = service.spreadsheets()

        # Get the current sheet size
        sheet_metadata = sheet.get(spreadsheetId=sheet_id).execute()
        properties = sheet_metadata.get('sheets', [])[0].get('properties')
        sheet_title = properties.get('title')
        current_row_count = properties.get('gridProperties', {}).get('rowCount', 0)

        body = {'values': csv_data}
        logger.info(f"Request body: {body}")
        
        # If the sheet is getting too large, clear it first
        if current_row_count > 9900:  # Leaving some buffer
            logger.info(f"Clearing sheet {sheet_title} before appending new data")
            sheet.values().clear(spreadsheetId=sheet_id, range=f"{sheet_title}!A1:Z").execute()

        result = sheet.values().append(
            spreadsheetId=sheet_id,
            range=range_name,
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body=body
        ).execute()
        
        logger.info(f"Append result: {result}")
        return result
    except Exception as e:
        logger.error(f"Error in append_csv_to_google_sheet: {str(e)}", exc_info=True)
        raise

def send_email(subject, body, to_emails, attachments=[], sender_email=None, sender_password=None):
    try:
        if not sender_email or not sender_password:
            raise ValueError("Sender email credentials not provided.")

        # Limit to max 3 recipient emails (excluding Marcos and sender)
        if isinstance(to_emails, str):
            email_list = [email.strip() for email in to_emails.split(',')]
        elif isinstance(to_emails, list):
            email_list = [email.strip() for email in to_emails]
        else:
            raise ValueError("to_emails must be either a string or list")

        if len(email_list) > 5:
            raise ValueError("Cannot send to more than 5 email addresses.")

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['Subject'] = subject
        msg['To'] = ', '.join(to_emails)

        msg.attach(MIMEText(body, 'plain'))

        for attachment in attachments[:10]:  # Limit to 10 files
            filename = os.path.basename(attachment)
            with open(attachment, 'rb') as f:
                part = MIMEApplication(f.read(), Name=filename)
                part['Content-Disposition'] = f'attachment; filename="{filename}"'
                msg.attach(part)

        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            logger.info(f"Email sent successfully to {', '.join(to_emails)} from {sender_email}")

    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise

def gpt_process(prompt, model="gpt-4", max_tokens=4000):
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts and formats data."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.0
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error in GPT processing: {e}")
        return ""

def validate_parsed_data(parsed_data, expected_columns):
    if len(parsed_data) != len(expected_columns):
        logger.warning(f"Mismatch in number of columns. Expected {len(expected_columns)}, got {len(parsed_data)}")
    
    for i, (value, column) in enumerate(zip(parsed_data, expected_columns)):
        if column == 'Aseguradora' and value not in ['GNP', 'Qualitas', 'ANA', 'HDI', 'SURA', 'MAPFRE', '']:
            logger.warning(f"Invalid Aseguradora value: {value}")
        elif not value and column not in ['No. de Pago', 'e-mail', 'PDF']:
            logger.warning(f"Empty value for column {column}")
    
    return parsed_data

def process_text_with_openai(prompt):
    try:
        response = openai.ChatCompletion.create(
            model='gpt-4',  # Use the appropriate model
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.0,
        )
        response_text = response.choices[0].message.content.strip()
        logger.info("Received response from OpenAI.")
        return response_text
    except Exception as e:
        logger.error(f"Error during OpenAI API call: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html', prompts=PROMPTS)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'files' not in request.files:
        flash('No file part')
        return redirect(request.url)

    files = request.files.getlist('files')
    sheet_name = request.form['sheet']
    if sheet_name not in PROMPTS:
        flash('Invalid sheet name')
        return redirect(request.url)

    texts = []
    for file in files:
        if file:
            try:
                temp_path = os.path.join(UPLOAD_FOLDER, file.filename)
                file.save(temp_path)
                
                if file.filename.lower().endswith('.pdf'):
                    with fitz.open(temp_path) as doc:
                        pdf_text = ""
                        for page in doc:
                            pdf_text += page.get_text()
                    texts.append(pdf_text)
                else:
                    # For non-PDF files, you might want to handle them differently
                    # For now, we'll just add a placeholder text
                    texts.append(f"File uploaded: {file.filename}")
                
                os.remove(temp_path)
            except Exception as e:
                flash(f"An error occurred processing {file.filename}: {str(e)}")
                logger.error(f"Error processing file {file.filename}: {str(e)}")

    if not texts:
        flash("No text was extracted from the uploaded files.")
        return redirect(request.url)

    columns = fetch_column_names(SHEET_ID, sheet_name)
    if not columns:
        flash(f"Failed to fetch columns for {sheet_name}.")
        return redirect(request.url)

    try:
        parsed_data = parse_text_with_gpt(texts, columns, sheet_name)
        logger.info(f"Parsed data (first 5 rows): {parsed_data[:5]}")
        
        email_summary = generate_email_summary(parsed_data)

        return render_template('preview.html', sheet_name=sheet_name, parsed_data=parsed_data, columns=columns, email_summary=email_summary)
    except Exception as e:
        flash(f"An error occurred during parsing: {str(e)}")
        logger.error(f"Error parsing combined text: {str(e)}")
        return redirect(request.url)

@app.route('/save', methods=['POST'])
def save_file():
    sheet_name = request.form['sheet_name']
    logger.info(f"Attempting to save data to sheet: {sheet_name}")

    # Debug logging
    logger.debug("Form data received:")
    for key, value in request.form.items():
        logger.debug(f"{key}: {value}")

    try:
        # Fetch columns from Google Sheets
        columns = fetch_column_names(SHEET_ID, sheet_name)
        if not columns:
            raise ValueError(f"Failed to fetch columns for {sheet_name}")

        row_count = int(request.form['row_count'])
        parsed_data = []

        # Process each row
        for row_index in range(row_count):
            row_data = []
            has_data = False

            # Process each column
            for col_index in range(len(columns)):
                field_name = f'row-{row_index}-col-{col_index}'
                value = request.form.get(field_name, '').strip()
                
                # Log the value being processed
                logger.debug(f"Processing {field_name}: {value}")
                
                if value:
                    has_data = True
                row_data.append(value)

            # Only add non-empty rows
            if has_data:
                parsed_data.append(row_data)
                logger.debug(f"Added row {row_index}: {row_data}")

        if not parsed_data:
            raise ValueError("No data to save")

        # Log the final data structure
        logger.info(f"Prepared {len(parsed_data)} rows for saving")
        logger.debug("Final data structure:")
        for idx, row in enumerate(parsed_data):
            logger.debug(f"Row {idx}: {row}")

        # Log the data being saved
        logger.info(f"Saving {len(parsed_data)} rows to {sheet_name}")
        logger.debug(f"Sample data - First row: {parsed_data[0] if parsed_data else 'No data'}")
        
        # Append to Google Sheets
        result = append_csv_to_google_sheet(SHEET_ID, parsed_data, sheet_name + '!A1')
        
        flash(f"Successfully saved {len(parsed_data)} rows to {sheet_name} sheet.")
        email_summary = generate_email_summary(parsed_data)
        
        return render_template('preview.html',
                             sheet_name=sheet_name,
                             parsed_data=parsed_data,
                             columns=columns,
                             email_summary=email_summary,
                             confirmation_message="Data successfully saved to Google Sheets.")
                             
    except Exception as e:
        logger.error(f"Failed to save data to Google Sheets: {str(e)}", exc_info=True)
        flash(f"Failed to save data to Google Sheets: {str(e)}")
        return render_template('preview.html',
                             sheet_name=sheet_name,
                             parsed_data=parsed_data,
                             columns=columns,
                             error_message=str(e))

@app.route('/send', methods=['POST'])
def send_email_route():
    try:
        recipient_email = request.form.get('email')
        email_body = request.form.get('email_body')
        sheet_name = request.form.get('sheet_name')
        sender_key = request.form.get('sender_email')  # Get the selected sender

        if not recipient_email or not email_body or not sheet_name or not sender_key:
            flash("Missing email, body, sheet name, or sender selection.")
            return render_template('preview.html', sheet_name=sheet_name, columns=[], email_summary=email_body)

        # Get sender account details
        sender_account = SENDER_ACCOUNTS.get(sender_key)
        if not sender_account:
            flash("Invalid sender selected.")
            return render_template('preview.html', sheet_name=sheet_name, columns=[], email_summary=email_body)

        sender_email = sender_account['EMAIL_ADDRESS']
        sender_password = sender_account['EMAIL_PASSWORD']

        email_subject = "Envío de póliza"
        attachments = request.files.getlist('attachments')

        # Collect attachments
        email_attachments = []
        for attachment in attachments:
            if attachment:
                filename = secure_filename(attachment.filename)
                attachment_path = os.path.join(PARSED_FOLDER, filename)
                attachment.save(attachment_path)
                email_attachments.append(attachment_path)

        # Prepare the list of recipients
        to_emails = [recipient_email, MARCOS_EMAIL, sender_email]  # Send to recipient, Marcos, and the sender

        # Send the email
        send_email(
            subject=email_subject,
            body=email_body,
            to_emails=to_emails,
            attachments=email_attachments,
            sender_email=sender_email,
            sender_password=sender_password
        )

        flash(f"Email sent successfully to {recipient_email}, Marcos, and yourself ({sender_email}).")
        confirmation_message = "Email sent successfully."

    except Exception as e:
        flash(f"An error occurred while sending the email: {e}")
        app.logger.error(f"Error during email send: {e}")
        confirmation_message = f"An error occurred: {e}"

    columns = fetch_column_names(SHEET_ID, sheet_name)
    return render_template(
        'preview.html',
        sheet_name=sheet_name,
        columns=columns,
        email_summary=email_body,
        confirmation_message=confirmation_message
    )

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True)

