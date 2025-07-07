import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Database, Brain, BarChart3, FileText, CheckCircle, AlertCircle, Play, Download, Zap, Search, Code, Table, Send, Bot, Sparkles, MessageCircle } from 'lucide-react';

interface CleaningLog {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface DataStats {
  shape: [number, number];
  columns: string[];
  nullCounts: Record<string, number>;
}

interface QueryResult {
  data: any[];
  columns: string[];
  query: string;
  executionTime?: number;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  query?: string;
  result?: QueryResult;
  timestamp: Date;
}

const COLUMN_MAPPING = {
  'transaction_id': ['transaction_id', 'transactionid', 'txn_id', 'transaction', 'txn', 'trans_id'],
  'date_of_sale': ['date_of_sale', 'sale_date', 'transaction_date', 'purchase_date', 'sale_datetime', 'date'],
  'brand': ['brand', 'product_brand', 'company', 'manufacturer', 'product_label', 'product_make'],
  'product_name': ['product_name', 'item_name', 'product', 'item', 'product_label', 'item_description'],
  'category': ['category', 'product_category', 'product_type', 'item_category', 'category_name'],
  'sub_category': ['sub_category', 'subcategory', 'category_type', 'item_subcategory'],
  'size': ['size', 'product_size', 'item_size', 'garment_size', 'shoe_size'],
  'color': ['color', 'product_color', 'item_color', 'colour'],
  'price': ['price', 'cost', 'product_price', 'item_price', 'cost_price', 'unit_price'],
  'discount_percent': ['discount_percent', 'discount', 'discount_rate', 'discount_value'],
  'final_price': ['final_price', 'price_after_discount', 'sale_price', 'final_cost', 'net_price'],
  'quantity': ['quantity', 'qty', 'units', 'item_count', 'quantity_sold'],
  'payment_mode': ['payment_mode', 'payment_method', 'transaction_mode', 'payment_type', 'payment_method_type'],
  'store_location': ['store_location', 'outlet', 'store', 'store_name', 'location', 'store_address'],
  'sales_channel': ['sales_channel', 'channel', 'selling_channel', 'sale_channel', 'channel_type'],
  'customer_id': ['customer_id', 'user_id', 'client_id', 'customer_number', 'account_id'],
  'customer_gender': ['customer_gender', 'gender', 'user_gender', 'customer_sex'],
  'return_status': ['return_status', 'is_returned', 'return', 'return_flag', 'return_ind'],
  'return_reason': ['return_reason', 'reason_for_return', 'return_cause', 'return_description', 'reason'],
  'review_text': ['review_text', 'customer_review', 'feedback', 'product_review', 'review'],
  'co2_saved': ['co2_saved', 'carbon_saved', 'carbon_emission_saved', 'co2_reduction'],
  'rating': ['rating', 'product_rating', 'customer_rating', 'user_rating', 'product_review_score'],
  'delivery_days': ['delivery_days', 'days_to_deliver', 'delivery_time', 'shipping_days', 'shipping_time']
};

const PREDEFINED_QUERIES = {
  "What is the most sold product?": "SELECT product_name, SUM(quantity) AS total_sold FROM data GROUP BY product_name ORDER BY total_sold DESC LIMIT 1",
  "Which brand had the highest revenue?": "SELECT brand, SUM(final_price * quantity) AS revenue FROM data GROUP BY brand ORDER BY revenue DESC LIMIT 1",
  "Which category has the most returns?": "SELECT category, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY category ORDER BY return_count DESC LIMIT 1",
  "What is the average delivery time?": "SELECT AVG(delivery_days) AS avg_delivery_time FROM data",
  "Which payment mode is most used?": "SELECT payment_mode, COUNT(*) AS count FROM data GROUP BY payment_mode ORDER BY count DESC LIMIT 1",
  "Which store location had the highest revenue?": "SELECT store_location, SUM(final_price * quantity) AS revenue FROM data GROUP BY store_location ORDER BY revenue DESC LIMIT 1",
  "What is the average discount given?": "SELECT AVG(discount_percent) AS avg_discount FROM data",
  "Which brand has the best average rating?": "SELECT brand, AVG(rating) AS avg_rating FROM data GROUP BY brand ORDER BY avg_rating DESC LIMIT 1",
  "What are the top 5 returned products?": "SELECT product_name, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY product_name ORDER BY return_count DESC LIMIT 5",
  "Which sales channel performs best?": "SELECT sales_channel, SUM(final_price * quantity) AS total_sales FROM data GROUP BY sales_channel ORDER BY total_sales DESC LIMIT 1",
  "Which product has the highest average rating?": "SELECT product_name, AVG(rating) AS avg_rating FROM data GROUP BY product_name ORDER BY avg_rating DESC LIMIT 1",
  "Which gender contributes most to sales?": "SELECT customer_gender, SUM(final_price * quantity) AS total_sales FROM data GROUP BY customer_gender ORDER BY total_sales DESC LIMIT 1",
  "What is the total CO2 saved from returns?": "SELECT SUM(co2_saved) AS total_co2_saved FROM data WHERE return_status = 1",
  "What is the average price of products sold?": "SELECT AVG(price) AS avg_price FROM data",
  "Which color is most popular?": "SELECT color, SUM(quantity) AS count FROM data GROUP BY color ORDER BY count DESC LIMIT 1",
  "Which size is most sold?": "SELECT size, SUM(quantity) AS count FROM data GROUP BY size ORDER BY count DESC LIMIT 1",
  "What are the top 5 brands by sales?": "SELECT brand, SUM(final_price * quantity) AS revenue FROM data GROUP BY brand ORDER BY revenue DESC LIMIT 5",
  "Which city has the most returns?": "SELECT store_location, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY store_location ORDER BY return_count DESC LIMIT 1",
  "What is the return rate overall?": "SELECT ROUND(100.0 * SUM(CASE WHEN return_status THEN 1 ELSE 0 END) / COUNT(*), 2) AS return_rate FROM data",
  "What is the best performing sub-category?": "SELECT sub_category, SUM(final_price * quantity) AS revenue FROM data GROUP BY sub_category ORDER BY revenue DESC LIMIT 1",
  "What are the top 3 payment modes used?": "SELECT payment_mode, COUNT(*) AS count FROM data GROUP BY payment_mode ORDER BY count DESC LIMIT 3",
  "Which brand has the highest average discount?": "SELECT brand, AVG(discount_percent) AS avg_discount FROM data GROUP BY brand ORDER BY avg_discount DESC LIMIT 1",
  "Which product is returned the most?": "SELECT product_name, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY product_name ORDER BY return_count DESC LIMIT 1",
  "Which day had the highest sales?": "SELECT date_of_sale, SUM(final_price * quantity) AS revenue FROM data GROUP BY date_of_sale ORDER BY revenue DESC LIMIT 1",
  "Which gender returns products the most?": "SELECT customer_gender, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY customer_gender ORDER BY return_count DESC LIMIT 1",
  "Which city has the lowest average delivery time?": "SELECT store_location, AVG(delivery_days) AS avg_days FROM data GROUP BY store_location ORDER BY avg_days ASC LIMIT 1",
  "What are the least sold products?": "SELECT product_name, SUM(quantity) AS total_sold FROM data GROUP BY product_name ORDER BY total_sold ASC LIMIT 5",
  "Which category has the highest average price?": "SELECT category, AVG(price) AS avg_price FROM data GROUP BY category ORDER BY avg_price DESC LIMIT 1",
  "How many items were sold overall?": "SELECT SUM(quantity) AS total_items_sold FROM data",
  "Which product has the lowest return rate?": "SELECT product_name, 100.0 * SUM(CASE WHEN return_status THEN 1 ELSE 0 END) / COUNT(*) AS return_rate FROM data GROUP BY product_name ORDER BY return_rate ASC LIMIT 1",
  "What is the average rating by category?": "SELECT category, AVG(rating) AS avg_rating FROM data GROUP BY category",
  "Which payment method has highest average sale amount?": "SELECT payment_mode, AVG(final_price * quantity) AS avg_sale FROM data GROUP BY payment_mode ORDER BY avg_sale DESC LIMIT 1",
  "Which store sold the most quantity?": "SELECT store_location, SUM(quantity) AS total_sold FROM data GROUP BY store_location ORDER BY total_sold DESC LIMIT 1",
  "What are the top 5 most discounted products?": "SELECT product_name, AVG(discount_percent) AS avg_discount FROM data GROUP BY product_name ORDER BY avg_discount DESC LIMIT 5",
  "Which gender gives highest average ratings?": "SELECT customer_gender, AVG(rating) AS avg_rating FROM data GROUP BY customer_gender ORDER BY avg_rating DESC LIMIT 1",
  "Which city generates the most revenue from returns?": "SELECT store_location, SUM(final_price * quantity) AS returned_revenue FROM data WHERE return_status = 1 GROUP BY store_location ORDER BY returned_revenue DESC LIMIT 1",
  "Which category has the most quantity sold?": "SELECT category, SUM(quantity) AS total_quantity FROM data GROUP BY category ORDER BY total_quantity DESC LIMIT 1",
  "How many products were sold online vs offline?": "SELECT sales_channel, SUM(quantity) AS total_sold FROM data GROUP BY sales_channel",
  "Which product category sells best in Delhi?": "SELECT category, SUM(quantity) AS total_sold FROM data WHERE store_location = 'Delhi' GROUP BY category ORDER BY total_sold DESC LIMIT 1",
  "What is the total sales revenue?": "SELECT SUM(final_price * quantity) AS total_revenue FROM data",
  "Which color is returned the most?": "SELECT color, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY color ORDER BY return_count DESC LIMIT 1",
  "Which brand has highest return rate?": "SELECT brand, 100.0 * SUM(CASE WHEN return_status THEN 1 ELSE 0 END) / COUNT(*) AS return_rate FROM data GROUP BY brand ORDER BY return_rate DESC LIMIT 1",
  "What is the average final price per product?": "SELECT AVG(final_price) AS avg_final_price FROM data",
  "What are the most common return reasons?": "SELECT return_reason, COUNT(*) AS count FROM data WHERE return_status = 1 GROUP BY return_reason ORDER BY count DESC LIMIT 5",
  "Which category has the highest average rating?": "SELECT category, AVG(rating) AS avg_rating FROM data GROUP BY category ORDER BY avg_rating DESC LIMIT 1",
  "Which brand sells most via app?": "SELECT brand, SUM(quantity) AS total_sold FROM data WHERE sales_channel = 'App' GROUP BY brand ORDER BY total_sold DESC LIMIT 1"
};

// Feature comparison data from your Streamlit code
const FEATURE_COMPARISON_DATA = {
  "Multiple Data Ingestion Sources": { ForesightFlow: 1, Stylumia: 1, Fractal: 1, EDITED: 1, "Woven Insights": 1 },
  "Hyperlocal Sentiment Analysis": { ForesightFlow: 1, Stylumia: 0, Fractal: 1, EDITED: 0, "Woven Insights": 1 },
  "Quick Win Trend Analysis": { ForesightFlow: 1, Stylumia: 1, Fractal: 1, EDITED: 0, "Woven Insights": 1 },
  "Prompt-based Business Querying": { ForesightFlow: 1, Stylumia: 0, Fractal: 1, EDITED: 1, "Woven Insights": 1 },
  "Strategy Testing / Simulation": { ForesightFlow: 1, Stylumia: 1, Fractal: 1, EDITED: 0, "Woven Insights": 0 },
  "Consulting-style Auto Report Generation": { ForesightFlow: 1, Stylumia: 0, Fractal: 1, EDITED: 0, "Woven Insights": 0 },
  "Design Ideation (Visual AI)": { ForesightFlow: 0, Stylumia: 1, Fractal: 0, EDITED: 0, "Woven Insights": 0 },
  "SKU-Level Pricing Automation": { ForesightFlow: 0, Stylumia: 0, Fractal: 1, EDITED: 1, "Woven Insights": 0 },
  "Generative AI Narrative Insights": { ForesightFlow: 1, Stylumia: 1, Fractal: 1, EDITED: 1, "Woven Insights": 1 },
  "Product Matching (CV/NLP embeddings)": { ForesightFlow: 0, Stylumia: 1, Fractal: 0, EDITED: 1, "Woven Insights": 0 }
};

// SQL Parser and Executor
class SQLExecutor {
  private data: any[];

  constructor(data: any[]) {
    this.data = data;
  }

  execute(sql: string): { data: any[], columns: string[] } {
    try {
      // Parse the SQL query
      const parsedQuery = this.parseSQL(sql);
      
      // Execute based on query type
      if (parsedQuery.type === 'SELECT') {
        return this.executeSelect(parsedQuery);
      }
      
      return { data: [], columns: [] };
    } catch (error) {
      console.error('SQL Execution Error:', error);
      return { data: [{ error: 'Query execution failed' }], columns: ['error'] };
    }
  }

  private parseSQL(sql: string) {
    const cleanSQL = sql.trim().toUpperCase();
    
    // Extract SELECT fields
    const selectMatch = cleanSQL.match(/SELECT\s+(.*?)\s+FROM/);
    const selectFields = selectMatch ? selectMatch[1].split(',').map(f => f.trim()) : ['*'];
    
    // Extract WHERE conditions
    const whereMatch = cleanSQL.match(/WHERE\s+(.*?)(?:\s+GROUP|\s+ORDER|\s+LIMIT|$)/);
    const whereClause = whereMatch ? whereMatch[1] : null;
    
    // Extract GROUP BY
    const groupByMatch = cleanSQL.match(/GROUP\s+BY\s+(.*?)(?:\s+ORDER|\s+LIMIT|$)/);
    const groupByFields = groupByMatch ? groupByMatch[1].split(',').map(f => f.trim()) : null;
    
    // Extract ORDER BY
    const orderByMatch = cleanSQL.match(/ORDER\s+BY\s+(.*?)(?:\s+LIMIT|$)/);
    const orderByClause = orderByMatch ? orderByMatch[1] : null;
    
    // Extract LIMIT
    const limitMatch = cleanSQL.match(/LIMIT\s+(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1]) : null;

    return {
      type: 'SELECT',
      fields: selectFields,
      where: whereClause,
      groupBy: groupByFields,
      orderBy: orderByClause,
      limit: limit
    };
  }

  private executeSelect(query: any): { data: any[], columns: string[] } {
    let result = [...this.data];

    // Apply WHERE clause
    if (query.where) {
      result = this.applyWhere(result, query.where);
    }

    // Apply GROUP BY
    if (query.groupBy) {
      result = this.applyGroupBy(result, query.groupBy, query.fields);
    } else {
      // Apply SELECT fields for non-grouped queries
      result = this.applySelect(result, query.fields);
    }

    // Apply ORDER BY
    if (query.orderBy) {
      result = this.applyOrderBy(result, query.orderBy);
    }

    // Apply LIMIT
    if (query.limit) {
      result = result.slice(0, query.limit);
    }

    // Get column names
    const columns = result.length > 0 ? Object.keys(result[0]) : [];

    return { data: result, columns };
  }

  private applyWhere(data: any[], whereClause: string): any[] {
    return data.filter(row => {
      try {
        // Handle return_status conditions
        if (whereClause.includes('RETURN_STATUS = 1')) {
          return row.return_status === 1 || row.return_status === '1' || row.return_status === true;
        }
        
        // Handle specific value conditions like store_location = 'Delhi'
        const equalityMatch = whereClause.match(/(\w+)\s*=\s*'([^']+)'/);
        if (equalityMatch) {
          const [, field, value] = equalityMatch;
          return row[field.toLowerCase()] === value;
        }

        return true;
      } catch (error) {
        return true;
      }
    });
  }

  private applyGroupBy(data: any[], groupByFields: string[], selectFields: string[]): any[] {
    const groups: { [key: string]: any[] } = {};
    
    // Group the data
    data.forEach(row => {
      const groupKey = groupByFields.map(field => row[field.toLowerCase()] || '').join('|');
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(row);
    });

    // Aggregate the groups
    return Object.entries(groups).map(([groupKey, groupRows]) => {
      const result: any = {};
      
      // Add group by fields
      groupByFields.forEach((field, index) => {
        const fieldName = field.toLowerCase();
        result[fieldName] = groupKey.split('|')[index];
      });

      // Process aggregate functions
      selectFields.forEach(field => {
        if (field.includes('SUM(')) {
          const sumField = this.extractFieldFromFunction(field, 'SUM');
          const alias = this.extractAlias(field);
          
          if (sumField.includes('*')) {
            // Handle SUM(final_price * quantity)
            const [field1, field2] = sumField.split('*').map(f => f.trim());
            result[alias] = groupRows.reduce((sum, row) => {
              const val1 = parseFloat(row[field1]) || 0;
              const val2 = parseFloat(row[field2]) || 0;
              return sum + (val1 * val2);
            }, 0);
          } else {
            result[alias] = groupRows.reduce((sum, row) => sum + (parseFloat(row[sumField]) || 0), 0);
          }
        } else if (field.includes('COUNT(')) {
          const alias = this.extractAlias(field);
          result[alias] = groupRows.length;
        } else if (field.includes('AVG(')) {
          const avgField = this.extractFieldFromFunction(field, 'AVG');
          const alias = this.extractAlias(field);
          const sum = groupRows.reduce((sum, row) => sum + (parseFloat(row[avgField]) || 0), 0);
          result[alias] = groupRows.length > 0 ? sum / groupRows.length : 0;
        } else if (field.includes('CASE WHEN')) {
          // Handle CASE WHEN return_status THEN 1 ELSE 0 END
          const alias = this.extractAlias(field);
          if (field.includes('return_status')) {
            const returnCount = groupRows.filter(row => 
              row.return_status === 1 || row.return_status === '1' || row.return_status === true
            ).length;
            
            if (field.includes('100.0 *')) {
              // Return rate calculation
              result[alias] = groupRows.length > 0 ? (returnCount / groupRows.length) * 100 : 0;
            } else {
              result[alias] = returnCount;
            }
          }
        } else if (!field.includes('(') && !groupByFields.includes(field)) {
          // Regular field (take first value from group)
          const fieldName = field.toLowerCase();
          result[fieldName] = groupRows[0][fieldName];
        }
      });

      return result;
    });
  }

  private applySelect(data: any[], selectFields: string[]): any[] {
    if (selectFields.includes('*')) {
      return data;
    }

    return data.map(row => {
      const result: any = {};
      selectFields.forEach(field => {
        if (field.includes('SUM(')) {
          const sumField = this.extractFieldFromFunction(field, 'SUM');
          const alias = this.extractAlias(field);
          
          if (sumField.includes('*')) {
            const [field1, field2] = sumField.split('*').map(f => f.trim());
            const val1 = parseFloat(row[field1]) || 0;
            const val2 = parseFloat(row[field2]) || 0;
            result[alias] = val1 * val2;
          } else {
            result[alias] = parseFloat(row[sumField]) || 0;
          }
        } else if (field.includes('AVG(')) {
          const avgField = this.extractFieldFromFunction(field, 'AVG');
          const alias = this.extractAlias(field);
          result[alias] = parseFloat(row[avgField]) || 0;
        } else {
          const fieldName = field.toLowerCase();
          result[fieldName] = row[fieldName];
        }
      });
      return result;
    });
  }

  private applyOrderBy(data: any[], orderByClause: string): any[] {
    const [field, direction = 'ASC'] = orderByClause.split(/\s+/);
    const fieldName = field.toLowerCase();
    const isDesc = direction.toUpperCase() === 'DESC';

    return data.sort((a, b) => {
      const aVal = parseFloat(a[fieldName]) || a[fieldName] || 0;
      const bVal = parseFloat(b[fieldName]) || b[fieldName] || 0;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return isDesc ? bVal - aVal : aVal - bVal;
      } else {
        const comparison = String(aVal).localeCompare(String(bVal));
        return isDesc ? -comparison : comparison;
      }
    });
  }

  private extractFieldFromFunction(field: string, func: string): string {
    const match = field.match(new RegExp(`${func}\\(([^)]+)\\)`, 'i'));
    return match ? match[1].trim() : '';
  }

  private extractAlias(field: string): string {
    const asMatch = field.match(/\s+AS\s+(\w+)/i);
    if (asMatch) {
      return asMatch[1].toLowerCase();
    }
    
    // If no AS clause, create alias from function
    if (field.includes('SUM(')) return 'sum_result';
    if (field.includes('COUNT(')) return 'count_result';
    if (field.includes('AVG(')) return 'avg_result';
    
    return field.toLowerCase();
  }
}

export const DataPipelineTab: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [cleanedData, setCleanedData] = useState<any[]>([]);
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>([]);
  const [beforeStats, setBeforeStats] = useState<DataStats | null>(null);
  const [afterStats, setAfterStats] = useState<DataStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preserveRows, setPreserveRows] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [activeStep, setActiveStep] = useState<'upload' | 'clean' | 'query'>('upload');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isGeneratingSQL, setIsGeneratingSQL] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<string>('Multiple Data Ingestion Sources');
  const [activeQueryMode, setActiveQueryMode] = useState<'predefined' | 'custom' | 'nlp'>('predefined');

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setActiveStep('upload');
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let data: any[] = [];
        
        if (file.name.endsWith('.csv')) {
          // Simple CSV parsing (you might want to use a proper CSV parser)
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          data = lines.slice(1).filter(line => line.trim()).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            return row;
          });
        }
        
        setRawData(data);
        setBeforeStats({
          shape: [data.length, Object.keys(data[0] || {}).length],
          columns: Object.keys(data[0] || {}),
          nullCounts: {}
        });
        
        setCleaningLogs([{
          message: `File uploaded successfully: ${file.name}`,
          type: 'success'
        }]);
        
      } catch (error) {
        setCleaningLogs([{
          message: `Error reading file: ${error}`,
          type: 'error'
        }]);
      }
    };
    
    reader.readAsText(file);
  }, []);

  const cleanData = useCallback(() => {
    if (!rawData.length) return;
    
    setIsProcessing(true);
    setActiveStep('clean');
    const logs: CleaningLog[] = [];
    
    try {
      // Create a copy of the data
      let cleaned = JSON.parse(JSON.stringify(rawData));
      
      // Column mapping
      const foundColumns: Record<string, string> = {};
      const dataColumns = Object.keys(cleaned[0] || {}).map(col => col.toLowerCase().trim());
      
      for (const [standardName, variants] of Object.entries(COLUMN_MAPPING)) {
        for (const variant of variants) {
          if (dataColumns.includes(variant.toLowerCase().trim())) {
            const originalName = Object.keys(cleaned[0] || {}).find(
              col => col.toLowerCase().trim() === variant.toLowerCase().trim()
            );
            if (originalName) {
              foundColumns[originalName] = standardName;
            }
          }
        }
      }
      
      // Rename columns
      cleaned = cleaned.map(row => {
        const newRow: any = {};
        for (const [oldName, newName] of Object.entries(foundColumns)) {
          newRow[newName] = row[oldName];
          logs.push({
            message: `Renamed column '${oldName}' to '${newName}'`,
            type: 'info'
          });
        }
        // Keep unmapped columns
        for (const [key, value] of Object.entries(row)) {
          if (!foundColumns[key]) {
            newRow[key] = value;
          }
        }
        return newRow;
      });
      
      logs.push({
        message: 'Column mapping completed',
        type: 'success'
      });
      
      // Data cleaning operations
      cleaned = cleaned.map(row => {
        const cleanedRow = { ...row };
        
        // Fill missing values
        if (!cleanedRow.return_reason || cleanedRow.return_reason === '') {
          cleanedRow.return_reason = 'No return reason';
        }
        if (!cleanedRow.review_text || cleanedRow.review_text === '') {
          cleanedRow.review_text = 'No review provided';
        }
        if (!cleanedRow.rating || cleanedRow.rating === '') {
          cleanedRow.rating = 0;
        }
        if (!cleanedRow.co2_saved || cleanedRow.co2_saved === '') {
          cleanedRow.co2_saved = 0;
        }
        
        // Convert date format
        if (cleanedRow.date_of_sale) {
          try {
            cleanedRow.date_of_sale = new Date(cleanedRow.date_of_sale).toISOString().split('T')[0];
          } catch (e) {
            // Keep original if conversion fails
          }
        }
        
        // Convert numeric fields
        if (cleanedRow.price) {
          cleanedRow.price = parseFloat(cleanedRow.price) || 0;
        }
        if (cleanedRow.final_price) {
          cleanedRow.final_price = parseFloat(cleanedRow.final_price) || 0;
        }
        if (cleanedRow.quantity) {
          cleanedRow.quantity = parseInt(cleanedRow.quantity) || 0;
        }
        if (cleanedRow.rating) {
          cleanedRow.rating = parseFloat(cleanedRow.rating) || 0;
        }
        if (cleanedRow.discount_percent) {
          const discount = parseFloat(cleanedRow.discount_percent) || 0;
          cleanedRow.discount_percent = Math.max(0, Math.min(100, discount));
        }
        
        // Convert return_status to boolean/number
        if (cleanedRow.return_status !== undefined) {
          if (cleanedRow.return_status === 'true' || cleanedRow.return_status === '1' || cleanedRow.return_status === 1) {
            cleanedRow.return_status = 1;
          } else {
            cleanedRow.return_status = 0;
          }
        }
        
        // Standardize text fields
        if (cleanedRow.brand) {
          cleanedRow.brand = cleanedRow.brand.toString().toUpperCase().trim();
        }
        if (cleanedRow.category) {
          cleanedRow.category = cleanedRow.category.toString().replace(/\b\w/g, l => l.toUpperCase()).trim();
        }
        if (cleanedRow.sub_category) {
          cleanedRow.sub_category = cleanedRow.sub_category.toString().replace(/\b\w/g, l => l.toUpperCase()).trim();
        }
        if (cleanedRow.payment_mode) {
          cleanedRow.payment_mode = cleanedRow.payment_mode.toString().toUpperCase().trim();
        }
        if (cleanedRow.store_location) {
          cleanedRow.store_location = cleanedRow.store_location.toString().replace(/\b\w/g, l => l.toUpperCase()).trim();
        }
        if (cleanedRow.sales_channel) {
          cleanedRow.sales_channel = cleanedRow.sales_channel.toString().replace(/\b\w/g, l => l.toUpperCase()).trim();
        }
        
        return cleanedRow;
      });
      
      logs.push({
        message: 'Data cleaning operations completed',
        type: 'success'
      });
      
      logs.push({
        message: 'Filled missing values with defaults',
        type: 'info'
      });
      
      logs.push({
        message: 'Converted numeric fields and standardized text',
        type: 'info'
      });
      
      setCleanedData(cleaned);
      setAfterStats({
        shape: [cleaned.length, Object.keys(cleaned[0] || {}).length],
        columns: Object.keys(cleaned[0] || {}),
        nullCounts: {}
      });
      
      logs.push({
        message: `Data cleaning completed successfully. Processed ${cleaned.length} rows.`,
        type: 'success'
      });
      
    } catch (error) {
      logs.push({
        message: `Error during cleaning: ${error}`,
        type: 'error'
      });
    }
    
    setCleaningLogs(logs);
    setIsProcessing(false);
  }, [rawData, preserveRows]);

  const executeQuery = useCallback((query: string) => {
    if (!cleanedData.length) return;
    
    setIsQuerying(true);
    setActiveStep('query');
    
    const startTime = Date.now();
    
    try {
      // Create SQL executor with cleaned data
      const executor = new SQLExecutor(cleanedData);
      
      // Execute the SQL query
      const result = executor.execute(query);
      
      const executionTime = Date.now() - startTime;
      
      setQueryResult({
        data: result.data,
        columns: result.columns,
        query,
        executionTime
      });
      
    } catch (error) {
      console.error('Query execution error:', error);
      setQueryResult({
        data: [{ error: 'Query execution failed' }],
        columns: ['error'],
        query,
        executionTime: Date.now() - startTime
      });
    }
    
    setIsQuerying(false);
  }, [cleanedData]);

  const handlePredefinedQuery = (question: string) => {
    const query = PREDEFINED_QUERIES[question as keyof typeof PREDEFINED_QUERIES];
    if (query) {
      setCurrentQuery(query);
      executeQuery(query);
      
      // Add to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: question,
        timestamp: new Date()
      };
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I'll execute this query for you: ${question}`,
        query,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, userMessage, assistantMessage]);
    }
  };

  const generateSQLFromNLP = useCallback(async (prompt: string) => {
    setIsGeneratingSQL(true);
    
    try {
      // Simulate AI SQL generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const schema = afterStats?.columns.join(', ') || '';
      
      // Simple pattern matching for demo (in real implementation, you'd call an AI API)
      let generatedSQL = '';
      
      if (prompt.toLowerCase().includes('most sold') || prompt.toLowerCase().includes('best selling')) {
        generatedSQL = "SELECT product_name, SUM(quantity) AS total_sold FROM data GROUP BY product_name ORDER BY total_sold DESC LIMIT 5";
      } else if (prompt.toLowerCase().includes('revenue') || prompt.toLowerCase().includes('sales')) {
        generatedSQL = "SELECT brand, SUM(final_price * quantity) AS revenue FROM data GROUP BY brand ORDER BY revenue DESC LIMIT 5";
      } else if (prompt.toLowerCase().includes('return')) {
        generatedSQL = "SELECT category, COUNT(*) AS return_count FROM data WHERE return_status = 1 GROUP BY category ORDER BY return_count DESC";
      } else if (prompt.toLowerCase().includes('average') || prompt.toLowerCase().includes('avg')) {
        generatedSQL = "SELECT AVG(price) AS average_price, AVG(rating) AS average_rating FROM data";
      } else {
        generatedSQL = "SELECT * FROM data LIMIT 10";
      }
      
      setCurrentQuery(generatedSQL);
      executeQuery(generatedSQL);
      
      // Add to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: prompt,
        timestamp: new Date()
      };
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I've generated and executed this SQL query based on your request:`,
        query: generatedSQL,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, userMessage, assistantMessage]);
      
    } catch (error) {
      console.error('Error generating SQL:', error);
    }
    
    setIsGeneratingSQL(false);
  }, [afterStats, executeQuery]);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPrompt.trim()) return;
    
    generateSQLFromNLP(currentPrompt);
    setCurrentPrompt('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Ingestion & Query Pipeline</h2>
            <p className="text-gray-600">Upload, clean, and query retail data files with AI-powered insights</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-6">
          {[
            { key: 'upload', label: 'Upload Data', icon: Upload },
            { key: 'clean', label: 'Clean & Process', icon: CheckCircle },
            { key: 'query', label: 'Query & Analyze', icon: Search }
          ].map(({ key, label, icon: Icon }, index) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${
                activeStep === key ? 'bg-blue-500 text-white' :
                index < ['upload', 'clean', 'query'].indexOf(activeStep) ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-sm font-medium ${
                activeStep === key ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {label}
              </span>
              {index < 2 && <div className="w-8 h-px bg-gray-300 mx-2"></div>}
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={preserveRows}
              onChange={(e) => setPreserveRows(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Preserve rows with invalid data</span>
          </label>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* File Upload */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 File Upload</h3>
          
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Upload CSV or Excel files</p>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4" />
              Choose File
            </label>
          </div>

          {uploadedFile && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>File:</strong> {uploadedFile.name}
              </p>
              <p className="text-sm text-blue-600">
                Size: {(uploadedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {rawData.length > 0 && (
            <button
              onClick={cleanData}
              disabled={isProcessing}
              className="w-full mt-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Clean Data
                </>
              )}
            </button>
          )}
        </div>

        {/* Data Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Data Preview</h3>
          
          <AnimatePresence mode="wait">
            {rawData.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Raw Data (First 5 rows)</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {beforeStats?.columns.slice(0, 5).map(col => (
                            <th key={col} className="px-3 py-2 text-left font-medium text-gray-700">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            {beforeStats?.columns.slice(0, 5).map(col => (
                              <td key={col} className="px-3 py-2 text-gray-600">
                                {String(row[col] || '').slice(0, 20)}
                                {String(row[col] || '').length > 20 ? '...' : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {cleanedData.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Cleaned Data (First 5 rows)</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-green-50">
                          <tr>
                            {afterStats?.columns.slice(0, 5).map(col => (
                              <th key={col} className="px-3 py-2 text-left font-medium text-green-700">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {cleanedData.slice(0, 5).map((row, index) => (
                            <tr key={index} className="border-t">
                              {afterStats?.columns.slice(0, 5).map(col => (
                                <td key={col} className="px-3 py-2 text-gray-600">
                                  {String(row[col] || '').slice(0, 20)}
                                  {String(row[col] || '').length > 20 ? '...' : ''}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Table className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Upload a file to see data preview</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cleaning Logs */}
      {cleaningLogs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Processing Logs</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            {cleaningLogs.map((log, index) => (
              <div key={index} className={`flex items-start gap-2 mb-2 ${
                log.type === 'success' ? 'text-green-700' :
                log.type === 'error' ? 'text-red-700' :
                log.type === 'warning' ? 'text-amber-700' :
                'text-blue-700'
              }`}>
                {log.type === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                {log.type === 'error' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                {log.type === 'info' && <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                <span className="text-sm">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Interface */}
      {cleanedData.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Query Interface</h3>
            
            {/* Query Mode Selector */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'predefined', label: 'Quick Questions', icon: Search },
                { key: 'nlp', label: 'AI Prompt', icon: Bot },
                { key: 'custom', label: 'Custom SQL', icon: Code }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveQueryMode(key as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeQueryMode === key 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Predefined Questions */}
            {activeQueryMode === 'predefined' && (
              <div className="space-y-2">
                {Object.keys(PREDEFINED_QUERIES).slice(0, 8).map(question => (
                  <button
                    key={question}
                    onClick={() => handlePredefinedQuery(question)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}

            {/* NLP Prompt Interface */}
            {activeQueryMode === 'nlp' && (
              <div>
                <form onSubmit={handlePromptSubmit} className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={currentPrompt}
                      onChange={(e) => setCurrentPrompt(e.target.value)}
                      placeholder="Ask a question about your data..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isGeneratingSQL}
                    />
                    <button
                      type="submit"
                      disabled={!currentPrompt.trim() || isGeneratingSQL}
                      className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      {isGeneratingSQL ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </form>

                {/* Example Prompts */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-2">Try asking:</p>
                  {[
                    "What are my best selling products?",
                    "Show me revenue by brand",
                    "Which products have the most returns?",
                    "What's the average customer rating?"
                  ].map(example => (
                    <button
                      key={example}
                      onClick={() => setCurrentPrompt(example)}
                      className="block w-full text-left p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom SQL */}
            {activeQueryMode === 'custom' && (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom SQL Query
                  </label>
                  <textarea
                    value={currentQuery}
                    onChange={(e) => setCurrentQuery(e.target.value)}
                    placeholder="SELECT * FROM data LIMIT 10"
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm font-mono"
                    rows={4}
                  />
                </div>

                <button
                  onClick={() => executeQuery(currentQuery)}
                  disabled={!currentQuery.trim() || isQuerying}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isQuerying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Query
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Schema Info */}
            {afterStats && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Table Schema</h4>
                <div className="text-sm text-gray-600">
                  <p><strong>Table:</strong> data</p>
                  <p><strong>Columns:</strong> {afterStats.columns.join(', ')}</p>
                  <p><strong>Rows:</strong> {afterStats.shape[0]}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Query Results</h3>
            
            {queryResult ? (
              <div>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-mono text-gray-700">{queryResult.query}</p>
                  {queryResult.executionTime && (
                    <p className="text-xs text-gray-500 mt-1">
                      Executed in {queryResult.executionTime}ms
                    </p>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-50">
                      <tr>
                        {queryResult.columns.map(col => (
                          <th key={col} className="px-3 py-2 text-left font-medium text-blue-700">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.data.slice(0, 10).map((row, index) => (
                        <tr key={index} className="border-t">
                          {queryResult.columns.map(col => (
                            <td key={col} className="px-3 py-2 text-gray-600">
                              {typeof row[col] === 'number' ? row[col].toLocaleString() : String(row[col] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export Results
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Run a query to see results</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat History */}
      {chatMessages.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💬 Query Chat History</h3>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {chatMessages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-lg ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {message.type === 'assistant' && <Bot className="w-4 h-4" />}
                    {message.type === 'user' && <MessageCircle className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {message.type === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                  </div>
                  <p className="text-sm">{message.content}</p>
                  {message.query && (
                    <div className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs font-mono">
                      {message.query}
                    </div>
                  )}
                  <div className="text-xs opacity-75 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Comparison */}
      {queryResult && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Feature Comparison</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose feature to compare:
            </label>
            <select
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              {Object.keys(FEATURE_COMPARISON_DATA).map(feature => (
                <option key={feature} value={feature}>{feature}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {Object.entries(FEATURE_COMPARISON_DATA[selectedFeature]).map(([company, support]) => (
              <div key={company} className="text-center">
                <div className={`h-20 rounded-lg flex items-end justify-center p-2 ${
                  support ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <div className={`w-full rounded ${support ? 'bg-blue-600' : 'bg-gray-300'}`} 
                       style={{ height: `${support * 100}%` }}>
                  </div>
                </div>
                <div className="mt-2 text-sm font-medium text-gray-700">{company}</div>
                <div className="text-xs text-gray-500">{support * 100}%</div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Feature Analysis: {selectedFeature}</h4>
            <p className="text-sm text-blue-800">
              ForesightFlow leads in {selectedFeature.toLowerCase()} with comprehensive implementation 
              compared to competitors in the fashion retail AI space.
            </p>
          </div>
        </div>
      )}

      {/* Statistics Comparison */}
      {beforeStats && afterStats && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Data Statistics</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Before Cleaning</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rows:</span>
                  <span className="font-medium">{beforeStats.shape[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Columns:</span>
                  <span className="font-medium">{beforeStats.shape[1]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Quality:</span>
                  <span className="font-medium text-amber-600">Raw</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-3">After Cleaning</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rows:</span>
                  <span className="font-medium">{afterStats.shape[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Columns:</span>
                  <span className="font-medium">{afterStats.shape[1]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Data Quality:</span>
                  <span className="font-medium text-green-600">Cleaned</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};